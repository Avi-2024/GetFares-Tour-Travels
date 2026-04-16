import { apiRequest } from "../api/apiClient";

export interface CurrencyRate {
  code: string;
  value: number;
}

export interface CurrencyRatesResponse {
  rates: Record<string, CurrencyRate>;
  source: 'cache' | 'api' | 'cache_fallback';
  updatedAt: string;
}

export interface ConvertResponse {
  amount: number;
  from: string;
  to: string;
  converted: number;
}

class CurrencyService {
  private cache: CurrencyRatesResponse | null = null;
  private cacheExpiry: number = 0;

  async getRates(): Promise<CurrencyRatesResponse> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    const response = await apiRequest<{ success: boolean; data: CurrencyRatesResponse }>('/api/currency/rates');
    this.cache = response.data;
    this.cacheExpiry = Date.now() + 60 * 60 * 1000; // 1 hour client cache
    return this.cache;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    const response = await apiRequest<{ success: boolean; data: ConvertResponse }>(
      `/api/currency/convert?amount=${amount}&from=${from}&to=${to}`
    );
    return response.data.converted;
  }

  async formatAmount(amount: number, currency: string): Promise<string> {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const currencyService = new CurrencyService();
