import axios from "axios";

const DEFAULT_SUPPORTED_CURRENCIES = Object.freeze([
  "AED",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "SAR",
]);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toSqlDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}`;
}

class CurrencyService {
  constructor({ db, logger, config }) {
    this.db = db;
    this.logger = logger;
    this.apiKey = config.currency?.apiKey || process.env.CURRENCY_API_KEY;
    this.useMock =
      config.currency?.useMock === true ||
      process.env.CURRENCY_USE_MOCK === "true";
    this.apiUrl = "https://api.currencyapi.com/v3/latest";
    this.baseCurrency = this.normalizeCurrency(
      config.currency?.baseCurrency || process.env.CURRENCY_BASE || "AED",
    );
    this.supportedCurrencies = this.buildSupportedCurrencies(
      config.currency?.supportedCurrencies,
    );
    this.memoryCache = null;
    this.memoryCacheExpiry = 0;
    this.mockRates = this.buildMockRates();
  }

  normalizeCurrency(code, fallback = "AED") {
    const normalized = String(code || "")
      .trim()
      .toUpperCase();
    return normalized || fallback;
  }

  buildSupportedCurrencies(codes) {
    const merged = Array.isArray(codes)
      ? codes.map((code) => this.normalizeCurrency(code)).filter(Boolean)
      : [...DEFAULT_SUPPORTED_CURRENCIES];

    if (!merged.includes(this.baseCurrency)) {
      merged.unshift(this.baseCurrency);
    }

    return Array.from(new Set(merged));
  }

  buildMockRates() {
    const mockByAed = {
      AED: 1,
      USD: 0.272294,
      EUR: 0.261583,
      GBP: 0.223,
      INR: 22.65,
      SAR: 1.02,
    };

    if (this.baseCurrency === "AED") {
      return this.supportedCurrencies.reduce((accumulator, currency) => {
        const value = Number(mockByAed[currency] ?? 1);
        accumulator[currency] = { code: currency, value };
        return accumulator;
      }, {});
    }

    const baseRate = Number(mockByAed[this.baseCurrency] ?? 1);
    return this.supportedCurrencies.reduce((accumulator, currency) => {
      const targetRate = Number(mockByAed[currency] ?? 1);
      accumulator[currency] = {
        code: currency,
        value: targetRate / baseRate,
      };
      return accumulator;
    }, {});
  }

  extractRateValue(rateRow) {
    if (typeof rateRow === "number" && Number.isFinite(rateRow) && rateRow > 0) {
      return rateRow;
    }
    if (
      rateRow &&
      typeof rateRow === "object" &&
      Number.isFinite(rateRow.value) &&
      Number(rateRow.value) > 0
    ) {
      return Number(rateRow.value);
    }
    return null;
  }

  normalizeRatePayload(rawRates) {
    const normalized = {};

    this.supportedCurrencies.forEach((currency) => {
      if (currency === this.baseCurrency) {
        normalized[currency] = { code: currency, value: 1 };
        return;
      }

      const rateValue = this.extractRateValue(rawRates?.[currency]);
      if (rateValue !== null) {
        normalized[currency] = { code: currency, value: rateValue };
      }
    });

    if (!normalized[this.baseCurrency]) {
      normalized[this.baseCurrency] = { code: this.baseCurrency, value: 1 };
    }

    return normalized;
  }

  setMemoryCache(rates, updatedAt) {
    this.memoryCache = {
      rates,
      updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    };
    this.memoryCacheExpiry = Date.now() + SEVEN_DAYS_MS;
  }

  async getRates({ forceRefresh = false } = {}) {
    if (this.useMock) {
      const now = new Date().toISOString();
      this.setMemoryCache(this.mockRates, now);
      return {
        baseCurrency: this.baseCurrency,
        rates: this.mockRates,
        source: "mock",
        updatedAt: now,
      };
    }

    if (!forceRefresh && this.memoryCache && Date.now() < this.memoryCacheExpiry) {
      return {
        baseCurrency: this.baseCurrency,
        rates: this.memoryCache.rates,
        source: "memory_cache",
        updatedAt: this.memoryCache.updatedAt,
      };
    }

    const cached = await this.getCachedRates();
    if (!forceRefresh && cached && this.isCacheValid(cached.updatedAt)) {
      this.setMemoryCache(cached.rates, cached.updatedAt);
      return {
        baseCurrency: this.baseCurrency,
        rates: cached.rates,
        source: "db_cache",
        updatedAt: cached.updatedAt,
      };
    }

    try {
      const apiRates = await this.fetchFromApi();
      const normalizedRates = this.normalizeRatePayload(apiRates);
      const updatedAt = new Date().toISOString();
      await this.saveRates(normalizedRates, updatedAt);
      this.setMemoryCache(normalizedRates, updatedAt);
      return {
        baseCurrency: this.baseCurrency,
        rates: normalizedRates,
        source: this.apiKey ? "currencyapi" : "frankfurter",
        updatedAt,
      };
    } catch (error) {
      this.logger?.error?.(
        { module: "currency", error: error.message },
        "Failed to fetch live currency rates",
      );

      if (this.memoryCache) {
        return {
          baseCurrency: this.baseCurrency,
          rates: this.memoryCache.rates,
          source: "memory_cache_fallback",
          updatedAt: this.memoryCache.updatedAt,
        };
      }

      if (cached) {
        this.setMemoryCache(cached.rates, cached.updatedAt);
        return {
          baseCurrency: this.baseCurrency,
          rates: cached.rates,
          source: "db_cache_fallback",
          updatedAt: cached.updatedAt,
        };
      }

      throw error;
    }
  }

  async fetchFromApi() {
    if (this.apiKey) {
      const response = await axios.get(this.apiUrl, {
        params: {
          apikey: this.apiKey,
          base_currency: this.baseCurrency,
          currencies: this.supportedCurrencies.join(","),
        },
        timeout: 10000,
      });

      const payload = response?.data?.data;
      if (!payload || typeof payload !== "object") {
        throw new Error("Currency API returned invalid payload");
      }

      return payload;
    }

    const targets = this.supportedCurrencies.filter(
      (currency) => currency !== this.baseCurrency,
    );
    const response = await axios.get(`https://api.frankfurter.app/latest`, {
      params: {
        from: this.baseCurrency,
        to: targets.join(","),
      },
      timeout: 10000,
    });

    const rates = response?.data?.rates;
    if (!rates || typeof rates !== "object") {
      throw new Error("Frankfurter API returned invalid payload");
    }

    return rates;
  }

  async getCachedRates() {
    if (typeof this.db?.query !== "function") {
      return null;
    }

    try {
      const result = await this.db.query(
        `SELECT rates, updated_at
         FROM currency_rates
         WHERE base_currency = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
        [this.baseCurrency],
      );
      const row = result?.rows?.[0];
      if (!row) {
        return null;
      }

      const parsedRates =
        typeof row.rates === "string" ? JSON.parse(row.rates) : row.rates;
      if (!parsedRates || typeof parsedRates !== "object") {
        return null;
      }

      return {
        rates: this.normalizeRatePayload(parsedRates),
        updatedAt:
          row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : String(row.updated_at),
      };
    } catch (error) {
      this.logger?.warn?.(
        { module: "currency", error: error.message },
        "Failed to read cached currency rates",
      );
      return null;
    }
  }

  async saveRates(rates, updatedAt) {
    if (typeof this.db?.query !== "function") {
      return;
    }

    const sqlDateTime = toSqlDateTime(updatedAt);
    if (!sqlDateTime) {
      return;
    }

    try {
      await this.db.query(
        `INSERT INTO currency_rates (base_currency, rates, updated_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           rates = VALUES(rates),
           updated_at = VALUES(updated_at)`,
        [this.baseCurrency, JSON.stringify(rates), sqlDateTime],
      );
    } catch (error) {
      this.logger?.warn?.(
        { module: "currency", error: error.message },
        "Failed to persist currency rates cache",
      );
    }
  }

  isCacheValid(updatedAt) {
    const timestamp = new Date(updatedAt).getTime();
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    return Date.now() - timestamp < SEVEN_DAYS_MS;
  }

  getRateValue(rates, currency) {
    const normalized = this.normalizeCurrency(currency);
    const value = this.extractRateValue(rates?.[normalized]);
    if (value !== null) {
      return value;
    }
    if (normalized === this.baseCurrency) {
      return 1;
    }
    return null;
  }

  convertWithRates(amount, fromCurrency, toCurrency, rates) {
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber)) {
      throw new Error("amount must be a finite number");
    }

    const from = this.normalizeCurrency(fromCurrency);
    const to = this.normalizeCurrency(toCurrency);
    if (from === to) {
      return amountNumber;
    }

    const fromRate = this.getRateValue(rates, from);
    const toRate = this.getRateValue(rates, to);

    if (!fromRate) {
      throw new Error(`Currency ${from} not supported`);
    }
    if (!toRate) {
      throw new Error(`Currency ${to} not supported`);
    }

    if (from === this.baseCurrency) {
      return amountNumber * toRate;
    }
    if (to === this.baseCurrency) {
      return amountNumber / fromRate;
    }

    const inBase = amountNumber / fromRate;
    return inBase * toRate;
  }

  async convert(amount, fromCurrency, toCurrency) {
    const { rates } = await this.getRates();
    return this.convertWithRates(amount, fromCurrency, toCurrency, rates);
  }
}

export { CurrencyService };
