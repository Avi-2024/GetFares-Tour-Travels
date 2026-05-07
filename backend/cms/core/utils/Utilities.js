/**
 * Slug Generator
 * Single Responsibility: Generate URL-friendly slugs
 */
export class SlugGenerator {
  static generate(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static isValid(slug) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }
}

/**
 * Text Normalizer
 * Single Responsibility: Normalize text input
 */
export class TextNormalizer {
  static normalize(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  static normalizeArray(values) {
    if (!Array.isArray(values)) return [];
    return values.map((v) => this.normalize(v)).filter(Boolean);
  }
}

/**
 * Date Formatter
 * Single Responsibility: Format dates
 */
export class DateFormatter {
  static toDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  static toISO(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  static now() {
    return new Date().toISOString();
  }
}

/**
 * Number Converter
 * Single Responsibility: Convert and validate numbers
 */
export class NumberConverter {
  static toNumber(value, fallback = 0) {
    if (value === undefined || value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static toInteger(value, fallback = 0) {
    const num = this.toNumber(value, fallback);
    return Math.floor(num);
  }

  static toPositive(value, fallback = 0) {
    const num = this.toNumber(value, fallback);
    return Math.max(0, num);
  }

  static toFloat(value, decimals = 2, fallback = 0) {
    const num = this.toNumber(value, fallback);
    return parseFloat(num.toFixed(decimals));
  }
}

/**
 * Pagination Calculator
 * Single Responsibility: Calculate pagination parameters
 */
export class PaginationCalculator {
  constructor(page = 1, limit = 20, maxLimit = 100) {
    this._page = Math.max(1, NumberConverter.toInteger(page, 1));
    this._limit = Math.min(
      maxLimit,
      Math.max(1, NumberConverter.toInteger(limit, 20))
    );
    this._maxLimit = maxLimit;
  }

  get page() {
    return this._page;
  }

  get limit() {
    return this._limit;
  }

  get offset() {
    return (this._page - 1) * this._limit;
  }

  get maxLimit() {
    return this._maxLimit;
  }

  toObject() {
    return {
      page: this.page,
      limit: this.limit,
      offset: this.offset,
    };
  }

  static fromQuery(query) {
    return new PaginationCalculator(query.page, query.limit);
  }
}

/**
 * Validator
 * Single Responsibility: Validate data
 */
export class Validator {
  static isRequired(value, fieldName = 'Field') {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${fieldName} is required`);
    }
    return true;
  }

  static isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  static isUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  static isInRange(value, min, max) {
    const num = NumberConverter.toNumber(value);
    return num >= min && num <= max;
  }

  static isLength(value, min, max) {
    const length = String(value).length;
    return length >= min && length <= max;
  }

  static isOneOf(value, allowedValues) {
    return allowedValues.includes(value);
  }
}

/**
 * Object Mapper
 * Single Responsibility: Map between different object structures
 */
export class ObjectMapper {
  static snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  }

  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  }

  static mapKeys(obj, mapFn) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[mapFn(key)] = value;
    }
    return result;
  }

  static snakeToCamelObject(obj) {
    return this.mapKeys(obj, this.snakeToCamel);
  }

  static camelToSnakeObject(obj) {
    return this.mapKeys(obj, this.camelToSnake);
  }

  static pick(obj, keys) {
    const result = {};
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  static omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }
}
