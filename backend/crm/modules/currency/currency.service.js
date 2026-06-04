const DEFAULT_SUPPORTED_CURRENCIES = Object.freeze([
  "AED",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "SAR",
]);

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toSqlDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

class CurrencyService {
  constructor({ db, logger, config }) {
    this.db = db;
    this.logger = logger;
    this.baseCurrency = this.normalizeCurrency(
      config.currency?.baseCurrency || process.env.CURRENCY_BASE || "AED",
    );
    this.supportedCurrencies = this.buildSupportedCurrencies(
      config.currency?.supportedCurrencies,
    );
    this.memoryCache = null;
    this.memoryCacheExpiry = 0;
    this.fallbackRates = this.buildFallbackRates();
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

  buildFallbackRates() {
    const byAed = {
      AED: 1,
      USD: 0.272294,
      EUR: 0.261583,
      GBP: 0.223,
      INR: 22.65,
      SAR: 1.02,
    };

    if (this.baseCurrency === "AED") {
      return this.supportedCurrencies.reduce((accumulator, currency) => {
        accumulator[currency] = {
          code: currency,
          value: Number(byAed[currency] ?? 1),
        };
        return accumulator;
      }, {});
    }

    const baseRate = Number(byAed[this.baseCurrency] ?? 1);
    return this.supportedCurrencies.reduce((accumulator, currency) => {
      accumulator[currency] = {
        code: currency,
        value: Number(byAed[currency] ?? 1) / baseRate,
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
      Number.isFinite(Number(rateRow.value)) &&
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

  clearMemoryCache() {
    this.memoryCache = null;
    this.memoryCacheExpiry = 0;
  }

  async getRates({ forceRefresh = false } = {}) {
    if (!forceRefresh && this.memoryCache && Date.now() < this.memoryCacheExpiry) {
      return {
        baseCurrency: this.baseCurrency,
        rates: this.memoryCache.rates,
        updatedAt: this.memoryCache.updatedAt,
      };
    }

    const cached = await this.getCachedRates();
    if (cached) {
      this.setMemoryCache(cached.rates, cached.updatedAt);
      return {
        baseCurrency: this.baseCurrency,
        rates: cached.rates,
        updatedAt: cached.updatedAt,
      };
    }

    const updatedAt = new Date().toISOString();
    this.setMemoryCache(this.fallbackRates, updatedAt);
    return {
      baseCurrency: this.baseCurrency,
      rates: this.fallbackRates,
      updatedAt,
    };
  }

  async getCachedRates() {
    if (typeof this.db?.query !== "function") {
      return null;
    }

    try {
      const result = await this.db.query(
        `SELECT er.target_currency, er.rate, er.effective_date
         FROM exchange_rates er
         INNER JOIN (
           SELECT target_currency, MAX(effective_date) AS effective_date
           FROM exchange_rates
           WHERE base_currency = ?
           GROUP BY target_currency
         ) latest
           ON latest.target_currency = er.target_currency
          AND latest.effective_date = er.effective_date
         WHERE er.base_currency = ?`,
        [this.baseCurrency, this.baseCurrency],
      );

      const rows = result?.rows || [];
      if (!rows.length) {
        return null;
      }

      const latestDate = rows.reduce((value, row) => {
        const current = toSqlDate(row.effective_date) || String(row.effective_date || "");
        return current > value ? current : value;
      }, "");

      const rateMap = rows.reduce((accumulator, row) => {
        const code = this.normalizeCurrency(row.target_currency);
        const value = Number(row.rate);
        if (Number.isFinite(value) && value > 0) {
          accumulator[code] = { code, value };
        }
        return accumulator;
      }, {});

      return {
        rates: this.normalizeRatePayload(rateMap),
        updatedAt: latestDate || new Date().toISOString(),
      };
    } catch (error) {
      this.logger?.warn?.(
        { module: "currency", error: error.message },
        "Failed to read exchange rates",
      );
      return null;
    }
  }

  async upsertExchangeRate({ targetCurrency, rate, effectiveDate }) {
    const existing = await this.db.query(
      `SELECT id
       FROM exchange_rates
       WHERE base_currency = ?
         AND target_currency = ?
         AND effective_date = ?
       LIMIT 1`,
      [this.baseCurrency, targetCurrency, effectiveDate],
    );
    const id = existing?.rows?.[0]?.id;
    if (id) {
      await this.db.query(
        `UPDATE exchange_rates
         SET rate = ?
         WHERE id = ?`,
        [rate, id],
      );
      return;
    }

    await this.db.query(
      `INSERT INTO exchange_rates
         (base_currency, target_currency, rate, effective_date)
       VALUES (?, ?, ?, ?)`,
      [this.baseCurrency, targetCurrency, rate, effectiveDate],
    );
  }

  validateManagedRates(rawRates) {
    const normalized = this.normalizeRatePayload(rawRates);
    const missing = this.supportedCurrencies.filter(
      (currency) => !normalized[currency],
    );
    if (missing.length) {
      throw new Error(`Missing rates for: ${missing.join(", ")}`);
    }
    return normalized;
  }

  async updateManagedRates({ rates } = {}) {
    if (typeof this.db?.query !== "function") {
      throw new Error("Database connection is required to manage currency rates");
    }

    const normalizedRates = this.validateManagedRates(rates);
    const updatedAt = new Date().toISOString();
    const effectiveDate = toSqlDate(updatedAt);
    if (!effectiveDate) {
      throw new Error("Invalid effective date");
    }

    for (const currency of this.supportedCurrencies) {
      const value = this.getRateValue(normalizedRates, currency);
      if (value) {
        await this.upsertExchangeRate({
          targetCurrency: currency,
          rate: value,
          effectiveDate,
        });
      }
    }

    this.clearMemoryCache();
    this.setMemoryCache(normalizedRates, updatedAt);
    return {
      baseCurrency: this.baseCurrency,
      rates: normalizedRates,
      updatedAt,
    };
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
