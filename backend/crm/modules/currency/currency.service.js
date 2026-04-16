import axios from 'axios';

class CurrencyService {
  constructor({ db, logger, config }) {
    this.db = db;
    this.logger = logger;
    this.apiKey = config.currency?.apiKey || process.env.CURRENCY_API_KEY;
    this.useMock = config.currency?.useMock || process.env.CURRENCY_USE_MOCK === 'true';
    this.apiUrl = 'https://api.currencyapi.com/v3/latest';
    this.baseCurrency = 'AED';
    this.memoryCache = null;
    this.memoryCacheExpiry = 0;
    
    this.mockRates = {
      USD: { code: 'USD', value: 0.272294 },
      EUR: { code: 'EUR', value: 0.261583 },
      GBP: { code: 'GBP', value: 0.223000 },
      INR: { code: 'INR', value: 22.650000 },
      SAR: { code: 'SAR', value: 1.020000 },
      AED: { code: 'AED', value: 1.000000 },
    };
  }

  async getRates() {
    try {
      if (this.useMock) {
        this.logger.info('Using mock currency rates');
        return { rates: this.mockRates, source: 'mock', updatedAt: new Date() };
      }
      
      if (this.memoryCache && Date.now() < this.memoryCacheExpiry) {
        return { rates: this.memoryCache, source: 'memory_cache', updatedAt: new Date(this.memoryCacheExpiry - 7 * 24 * 60 * 60 * 1000) };
      }

      const cached = await this.getCachedRates();
      if (cached && this.isCacheValid(cached.updatedAt)) {
        this.memoryCache = cached.rates;
        this.memoryCacheExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
        return { rates: cached.rates, source: 'cache', updatedAt: cached.updatedAt };
      }

      const rates = await this.fetchFromAPI();
      await this.saveRates(rates);
      this.memoryCache = rates;
      this.memoryCacheExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      return { rates, source: 'api', updatedAt: new Date() };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to get currency rates');
      
      if (this.memoryCache) {
        return { rates: this.memoryCache, source: 'memory_cache_fallback', updatedAt: new Date() };
      }
      
      const cached = await this.getCachedRates();
      if (cached) {
        return { rates: cached.rates, source: 'cache_fallback', updatedAt: cached.updatedAt };
      }
      
      throw new Error('No currency rates available. Please check API key or enable mock mode.');
    }
  }

  async fetchFromAPI() {
    if (!this.apiKey) {
      throw new Error('CURRENCY_API_KEY not configured');
    }
    
    const response = await axios.get(this.apiUrl, {
      params: { apikey: this.apiKey, base_currency: this.baseCurrency },
      timeout: 10000
    });
    
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your CURRENCY_API_KEY.');
    }
    
    return response.data.data;
  }

  async getCachedRates() {
    try {
      const [rows] = await this.db.query(
        'SELECT rates, updated_at FROM currency_rates WHERE base_currency = ? ORDER BY updated_at DESC LIMIT 1',
        [this.baseCurrency]
      );
      return rows[0] ? { rates: JSON.parse(rows[0].rates), updatedAt: rows[0].updated_at } : null;
    } catch (error) {
      return null;
    }
  }

  async saveRates(rates) {
    try {
      await this.db.query(
        'INSERT INTO currency_rates (base_currency, rates, updated_at) VALUES (?, ?, NOW())',
        [this.baseCurrency, JSON.stringify(rates)]
      );
    } catch (error) {
      this.logger.warn({ error: error.message }, 'Failed to save rates');
    }
  }

  isCacheValid(updatedAt) {
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(updatedAt).getTime() < weekInMs;
  }

  async convert(amount, fromCurrency, toCurrency) {
    const { rates } = await this.getRates();
    
    if (!rates[fromCurrency]) {
      throw new Error(`Currency ${fromCurrency} not supported`);
    }
    
    if (!rates[toCurrency]) {
      throw new Error(`Currency ${toCurrency} not supported`);
    }
    
    if (fromCurrency === this.baseCurrency) {
      return amount * rates[toCurrency].value;
    }
    
    if (toCurrency === this.baseCurrency) {
      return amount / rates[fromCurrency].value;
    }
    
    const inBase = amount / rates[fromCurrency].value;
    return inBase * rates[toCurrency].value;
  }
}

export { CurrencyService };
