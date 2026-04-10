import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const RESERVED_FILTER_KEYS = new Set([
  "page",
  "limit",
  "offset",
  "sort",
  "order",
  "q",
  "search",
]);

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

    return value !== undefined && value !== null && value !== "";
  });
}

// Plain objects must become JSON strings for MySQL JSON columns (pg/jsonb passed objects through).
function bindValueForMysql(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

// MySQL uses backtick quoting for identifiers
function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `\`${identifier}\``;
}

function wrapDuplicateKeyError(error) {
  if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
    const wrapped = new Error(error.message);
    wrapped.code = "23505";
    wrapped.errno = error.errno;
    wrapped.sqlMessage = error.sqlMessage;
    return wrapped;
  }
  return error;
}

function runWithTimeout(task, timeoutMs, timeoutMessage) {
  if (!timeoutMs || timeoutMs <= 0) {
    return task();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage || "Operation timed out"));
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
    this.adapter = "in-memory";
  }

  getTable(tableName) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    return this.tables.get(tableName);
  }

  async insert(tableName, payload) {
    const table = this.getTable(tableName);
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(now).toISOString();
    const createdAt = payload.created_at || payload.createdAt || istDate;

    const row = {
      ...payload,
      id: payload.id || randomUUID(),
      created_at: createdAt,
      createdAt,
      updated_at: istDate,
      updatedAt: istDate,
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

        const camelKey = key.replace(/_([a-z])/g, (_, char) =>
          char.toUpperCase(),
        );
        const snakeKey = key.replace(
          /[A-Z]/g,
          (char) => `_${char.toLowerCase()}`,
        );
        return String(row[camelKey] ?? row[snakeKey]) === String(value);
      });
    });

    const limit = toPositiveInt(filters.limit);
    const page = toPositiveInt(filters.page);
    const requestedOffset = toNonNegativeInt(filters.offset);
    const offset =
      requestedOffset !== null ? requestedOffset
      : limit && page ? (page - 1) * limit
      : 0;

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

    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(now).toISOString();
    const updated = {
      ...existing,
      ...payload,
      id,
      updated_at: istDate,
      updatedAt: istDate,
    };

    table.set(id, updated);
    return updated;
  }

  async query() {
    throw new Error(
      "In-memory database adapter does not support raw SQL query.",
    );
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

class MySQLDatabase {
  constructor({ pool }) {
    this.pool = pool;
    this.adapter = "mysql";
  }

  async insert(tableName, payload) {
    const table = quoteIdentifier(tableName);

    const id = payload.id || randomUUID();
    const entries = Object.entries({ ...payload, id }).filter(
      ([, value]) => value !== undefined,
    );

    try {
      if (!entries.length) {
        await this.pool.query(`INSERT INTO ${table} (id) VALUES (?)`, [id]);
      } else {
        const columns = entries.map(([col]) => quoteIdentifier(col)).join(", ");
        const placeholders = entries.map(() => "?").join(", ");
        const values = entries.map(([, v]) => bindValueForMysql(v));
        await this.pool.query(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values,
        );
      }
    } catch (error) {
      throw wrapDuplicateKeyError(error);
    }

    const [rows] = await this.pool.query(
      `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async findById(tableName, id) {
    const table = quoteIdentifier(tableName);
    const [rows] = await this.pool.query(
      `SELECT * FROM ${table} WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
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
      .map(([key, value]) => {
        values.push(value);
        return `${quoteIdentifier(key)} = ?`;
      })
      .join(" AND ");

    let query = `SELECT * FROM ${table}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }

    const limit = toPositiveInt(filters.limit);
    const page = toPositiveInt(filters.page);
    const requestedOffset = toNonNegativeInt(filters.offset);
    const offset =
      requestedOffset !== null ? requestedOffset
      : limit && page ? (page - 1) * limit
      : null;

    if (limit) {
      query += ` LIMIT ?`;
      values.push(limit);
    }

    if (offset !== null) {
      query += ` OFFSET ?`;
      values.push(offset);
    }

    const [rows] = await this.pool.query(query, values);
    return rows;
  }

  async update(tableName, id, payload) {
    const entries = Object.entries(payload).filter(
      ([key, value]) => key !== "id" && value !== undefined,
    );
    if (!entries.length) {
      return this.findById(tableName, id);
    }

    const table = quoteIdentifier(tableName);
    const values = entries.map(([, v]) => bindValueForMysql(v));
    const setClause = entries
      .map(([key]) => `${quoteIdentifier(key)} = ?`)
      .join(", ");

    values.push(id);
    try {
      await this.pool.query(
        `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        values,
      );
    } catch (error) {
      throw wrapDuplicateKeyError(error);
    }

    return this.findById(tableName, id);
  }

  async query(sql, params = []) {
    const [result, fields] = await this.pool.query(sql, params);
    const rows = Array.isArray(result) ? result : [];
    return {
      rows,
      rowCount: Array.isArray(result) ? result.length : (result?.affectedRows ?? 0),
      fields,
    };
  }

  async healthCheck({ timeoutMs } = {}) {
    const startedAt = Date.now();

    await runWithTimeout(
      () => this.pool.query("SELECT 1"),
      timeoutMs,
      `MySQL health check timed out after ${timeoutMs}ms`,
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
  const mysqlHost = process.env.MYSQL_HOST;
  const mysqlUser = process.env.MYSQL_USER;
  const mysqlPassword = process.env.MYSQL_PASSWORD;
  const mysqlDatabase = process.env.MYSQL_DATABASE;
  const mysqlPort = Number(process.env.MYSQL_PORT) || 3306;

  if (mysqlHost && mysqlDatabase) {
    const isServerless =
      process.env.VERCEL === "1" || process.env.AWS_EXECUTION_ENV;

    const poolConfig = {
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPassword,
      database: mysqlDatabase,
      waitForConnections: true,
      connectionLimit: isServerless ? 2 : 10,
      queueLimit: 0,
      connectTimeout: isServerless ? 7000 : 15000,
      timezone: "+05:30",
    };

    logger.info(
      {
        mysqlHost,
        mysqlDatabase,
        mysqlPort,
        isServerless,
        poolConfig: {
          connectionLimit: poolConfig.connectionLimit,
          connectTimeout: poolConfig.connectTimeout,
        },
      },
      "Using MySQL database adapter.",
    );

    const pool = mysql.createPool(poolConfig);
    return new MySQLDatabase({ pool });
  }

  logger.warn("MYSQL_HOST / MYSQL_DATABASE not set. Falling back to in-memory adapter.");
  return new InMemoryDatabase();
}

export { createDatabaseConnection, InMemoryDatabase, MySQLDatabase };
