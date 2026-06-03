import { apiRequest } from "../api/apiClient";

export type CurrencyCode = "AED" | "USD" | "EUR" | "GBP" | "INR" | "SAR";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "AED",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "SAR",
];

export interface CurrencyRate {
  code: string;
  value: number;
}

export interface CurrencyRatesResponse {
  baseCurrency: string;
  rates: Record<string, CurrencyRate>;
  updatedAt: string;
}

export interface ConvertResponse {
  amount: number;
  from: string;
  to: string;
  converted: number;
}

type BrowserCache = {
  expiresAt: number;
  payload: CurrencyRatesResponse;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_KEY = "crm_currency_rates_cache_v1";

class CurrencyService {
  private cache: BrowserCache | null = null;

  private normalizeCurrency(currency: string, fallback = "AED") {
    const normalized = String(currency || "")
      .trim()
      .toUpperCase();
    return normalized || fallback;
  }

  private roundCurrency(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private extractRateValue(rate: unknown): number | null {
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      return rate;
    }
    if (
      rate &&
      typeof rate === "object" &&
      Number.isFinite((rate as CurrencyRate).value) &&
      Number((rate as CurrencyRate).value) > 0
    ) {
      return Number((rate as CurrencyRate).value);
    }
    return null;
  }

  private readBrowserCache(): BrowserCache | null {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache;
    }
    if (typeof window === "undefined" || !window.sessionStorage) {
      return null;
    }

    try {
      const raw = window.sessionStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as BrowserCache;
      if (!parsed?.payload || !parsed?.expiresAt) {
        return null;
      }
      if (Date.now() >= Number(parsed.expiresAt)) {
        window.sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      this.cache = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  private writeBrowserCache(payload: CurrencyRatesResponse) {
    const entry: BrowserCache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    };
    this.cache = entry;
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }

    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // no-op if storage unavailable
    }
  }

  async getRates(forceRefresh = false): Promise<CurrencyRatesResponse> {
    if (!forceRefresh) {
      const cached = this.readBrowserCache();
      if (cached) {
        return cached.payload;
      }
    }

    const response = await apiRequest<{ success: boolean; data: CurrencyRatesResponse }>(
      "/api/currency/rates",
    );
    const payload = response.data;
    this.writeBrowserCache(payload);
    return payload;
  }

  async updateRates(rates: Record<string, CurrencyRate | number>): Promise<CurrencyRatesResponse> {
    const response = await apiRequest<{ success: boolean; data: CurrencyRatesResponse }>(
      "/api/currency/rates",
      { method: "PATCH", body: { rates } },
    );
    this.clearCache();
    this.writeBrowserCache(response.data);
    return response.data;
  }

  private convertWithRates(
    amount: number,
    from: string,
    to: string,
    rates: Record<string, CurrencyRate>,
    baseCurrency: string,
  ): number {
    const normalizedFrom = this.normalizeCurrency(from);
    const normalizedTo = this.normalizeCurrency(to);
    if (normalizedFrom === normalizedTo) {
      return this.roundCurrency(amount);
    }

    const normalizedBase = this.normalizeCurrency(baseCurrency, "AED");
    const fromRate =
      normalizedFrom === normalizedBase
        ? 1
        : this.extractRateValue(rates[normalizedFrom]);
    const toRate =
      normalizedTo === normalizedBase ? 1 : this.extractRateValue(rates[normalizedTo]);

    if (!fromRate || !toRate) {
      throw new Error("Unsupported currency conversion");
    }

    if (normalizedFrom === normalizedBase) {
      return this.roundCurrency(amount * toRate);
    }
    if (normalizedTo === normalizedBase) {
      return this.roundCurrency(amount / fromRate);
    }
    return this.roundCurrency((amount / fromRate) * toRate);
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber)) {
      throw new Error("Amount must be a finite number");
    }

    const normalizedFrom = this.normalizeCurrency(from);
    const normalizedTo = this.normalizeCurrency(to);
    if (normalizedFrom === normalizedTo) {
      return this.roundCurrency(amountNumber);
    }

    try {
      const ratesPayload = await this.getRates();
      return this.convertWithRates(
        amountNumber,
        normalizedFrom,
        normalizedTo,
        ratesPayload.rates,
        ratesPayload.baseCurrency,
      );
    } catch {
      const response = await apiRequest<{ success: boolean; data: ConvertResponse }>(
        `/api/currency/convert?amount=${encodeURIComponent(
          amountNumber,
        )}&from=${encodeURIComponent(normalizedFrom)}&to=${encodeURIComponent(
          normalizedTo,
        )}`,
      );
      return this.roundCurrency(response.data.converted);
    }
  }

  formatAmount(amount: number, currency: string): string {
    const normalizedCurrency = this.normalizeCurrency(currency);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }

  clearCache(): void {
    this.cache = null;
    if (typeof window === "undefined" || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // no-op
    }
  }
}

export const currencyService = new CurrencyService();
