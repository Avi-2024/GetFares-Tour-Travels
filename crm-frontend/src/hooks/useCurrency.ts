import { useState, useEffect } from 'react';
import { currencyService } from '../services/currencyService';
import type { CurrencyRatesResponse } from '../services/currencyService';

export const useCurrency = () => {
  const [rates, setRates] = useState<CurrencyRatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await currencyService.getRates();
      setRates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load currency rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const convert = async (amount: number, from: string, to: string): Promise<number> => {
    try {
      return await currencyService.convert(amount, from, to);
    } catch (err: any) {
      throw new Error(err.message || 'Conversion failed');
    }
  };

  const formatAmount = async (amount: number, currency: string): Promise<string> => {
    return await currencyService.formatAmount(amount, currency);
  };

  return {
    rates,
    loading,
    error,
    convert,
    formatAmount,
    refresh: loadRates
  };
};
