const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const RESERVED_FILTER_KEYS = new Set(['page', 'limit', 'offset', 'sort', 'order', 'q', 'search']);

function toPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toNonNegativeInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function normalizeFilters(filters = {}) {
  return Object.entries(filters).filter(([key, value]) => {
    if (RESERVED_FILTER_KEYS.has(key)) {
      return false;
    }

    return value !== undefined && value !== null && value !== '';
  });
}

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function runWithTimeout(task, timeoutMs, timeoutMessage) {
  if (!timeoutMs || timeoutMs <= 0) {
    return task();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage || 'Operation timed out'));
    }, timeoutMs);

    timer.unref?.();

    task()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

class InMemoryDatabase {
  constructor() {
    this.tables = new Map();
    this.adapter = 'in-memory';
  }

  getTable(tableName) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    return this.tables.get(tableName);
  }

  async insert(tableName, payload) {
    const table = this.getTable(tableName);
    const now = new Date().toISOString();
    const createdAt = payload.created_at || payload.createdAt || now;

    const row = {
      ...payload,
      id: payload.id || randomUUID(),
      created_at: createdAt,
      createdAt,
      updated_at: now,
      updatedAt: now,
    };

    table.set(row.id, row);
    return row;
  }

  async findById(tableName, id) {
    const table = this.getTable(tableName);
    return table.get(id) || null;
  }

  async findOne(tableName, filters = {}) {
    const rows = await this.findMany(tableName, { ...filters, limit: 1 });
    return rows[0] || null;
  }

  async findMany(tableName, filters = {}) {
    const table = this.getTable(tableName);
    const rows = [...table.values()];
    const normalizedFilters = normalizeFilters(filters);

    const filtered = rows.filter((row) => {
      return normalizedFilters.every(([key, value]) => {
        if (String(row[key]) === String(value)) {
          return true;
        }

        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        const snakeKey = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
        return String(row[camelKey] ?? row[snakeKey]) === String(value);
      });
    });

    const limit = toPositiveInt(filters.limit);
    const page = toPositiveInt(filters.page);
    const requestedOffset = toNonNegativeInt(filters.offset);
    const offset = requestedOffset !== null ? requestedOffset : limit && page ? (page - 1) * limit : 0;

    const start = Math.max(0, offset || 0);
    if (!limit) {
      return filtered.slice(start);
    }

    return filtered.slice(start, start + limit);
  }

  async update(tableName, id, payload) {
    const table = this.getTable(tableName);
    const existing = table.get(id);

    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...payload,
      id,
      updated_at: now,
      updatedAt: now,
    };

    table.set(id, updated);
    return updated;
  }

  async query() {
    throw new Error('In-memory database adapter does not support raw SQL query.');
  }

  async healthCheck() {
    return {
      ok: true,
      adapter: this.adapter,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  async close() {
    return undefined;
  }
}

class PostgresDatabase {
  constructor({ pool }) {
    this.pool = pool;
    this.adapter = 'postgres';
  }

  async insert(tableName, payload) {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    const table = quoteIdentifier(tableName);

    if (!entries.length) {
      const result = await this.pool.query(`INSERT INTO ${table} DEFAULT VALUES RETURNING *`);
      return result.rows[0] || null;
    }

    const columns = entries.map(([column]) => quoteIdentifier(column)).join(', ');
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);

    const result = await this.pool.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  async findById(tableName, id) {
    const table = quoteIdentifier(tableName);
    const result = await this.pool.query(`SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
    return result.rows[0] || null;
  }

  async findOne(tableName, filters = {}) {
    const rows = await this.findMany(tableName, { ...filters, limit: 1 });
    return rows[0] || null;
  }

  async findMany(tableName, filters = {}) {
    const table = quoteIdentifier(tableName);
    const normalizedFilters = normalizeFilters(filters);
    const values = [];

    const whereClause = normalizedFilters
      .map(([key, value], index) => {
        values.push(value);
        return `${quoteIdentifier(key)} = $${index + 1}`;
      })
      .join(' AND ');

    let query = `SELECT * FROM ${table}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }

    const limit = toPositiveInt(filters.limit);
    const page = toPositiveInt(filters.page);
    const requestedOffset = toNonNegativeInt(filters.offset);
    const offset = requestedOffset !== null ? requestedOffset : limit && page ? (page - 1) * limit : null;

    if (limit) {
      values.push(limit);
      query += ` LIMIT $${values.length}`;
    }

    if (offset !== null) {
      values.push(offset);
      query += ` OFFSET $${values.length}`;
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async update(tableName, id, payload) {
    const entries = Object.entries(payload).filter(([key, value]) => key !== 'id' && value !== undefined);
    if (!entries.length) {
      return this.findById(tableName, id);
    }

    const table = quoteIdentifier(tableName);
    const values = entries.map(([, value]) => value);
    const setClause = entries
      .map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`)
      .join(', ');

    values.push(id);
    const result = await this.pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  async healthCheck({ timeoutMs } = {}) {
    const startedAt = Date.now();

    await runWithTimeout(
      () => this.pool.query('SELECT 1'),
      timeoutMs,
      `PostgreSQL health check timed out after ${timeoutMs}ms`,
    );

    return {
      ok: true,
      adapter: this.adapter,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }

  async close() {
    await this.pool.end();
  }
}

function createDatabaseConnection({ config, logger }) {
  if (config.database.url) {
    const pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    logger.info({ databaseUrlConfigured: true }, 'Using PostgreSQL database adapter.');
    return new PostgresDatabase({ pool });
  }

  logger.warn('DATABASE_URL is not set. Falling back to in-memory adapter.');
  return new InMemoryDatabase();
}

module.exports = { createDatabaseConnection, InMemoryDatabase, PostgresDatabase };
