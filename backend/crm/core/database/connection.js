import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { MssqlDatabase } from "./mssql-database.js";

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

function toMysqlUtcDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds(),
  )}`;
}

function maybeNormalizeIsoDateTimeString(value) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  // datetime-local sends "YYYY-MM-DDTHH:mm" with NO seconds — old regex required :ss and skipped these.
  // Passing that through raw let MySQL/TIMESTAMP mis-parse. Normalize any date+time string via Date.
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d)/.test(trimmed)) {
    return value;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const normalized = toMysqlUtcDateTime(parsed);
  return normalized || value;
}

// Plain objects must become JSON strings for MySQL JSON columns (pg/jsonb passed objects through).
function bindValueForMysql(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return toMysqlUtcDateTime(value);
  }
  if (typeof value === "string") {
    return maybeNormalizeIsoDateTimeString(value);
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

function normalizeRawSql(sql) {
  return String(sql || "")
    .trim()
    .replace(/;+\s*$/, "");
}

function convertQuotedIdentifiersToMySql(sql) {
  return sql.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, (_match, identifier) => `\`${identifier}\``);
}

function normalizeIntervalLiterals(sql) {
  return String(sql || "").replace(
    /\bINTERVAL\s*'(-?\d+)\s*(microsecond|microseconds|second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)'\b/gi,
    (_match, amount, rawUnit) => {
      const unit = String(rawUnit || "")
        .trim()
        .toUpperCase()
        .replace(/S$/, "");
      return `INTERVAL ${amount} ${unit}`;
    },
  );
}

function normalizeTableSchemaPublic(sql) {
  return String(sql || "").replace(
    /\btable_schema\s*=\s*'public'\b/gi,
    "table_schema = DATABASE()",
  );
}

/** PostgreSQL-only; MySQL uses LIKE (often with LOWER() for case-insensitivity). */
function replaceIlikeWithLike(sql) {
  return String(sql || "").replace(/\bILIKE\b/gi, "LIKE");
}

function normalizeSqlForMySql(sql, params = []) {
  let normalizedSql = String(sql || "");
  normalizedSql = convertQuotedIdentifiersToMySql(normalizedSql);
  normalizedSql = normalizeIntervalLiterals(normalizedSql);
  normalizedSql = normalizeTableSchemaPublic(normalizedSql);
  normalizedSql = replaceIlikeWithLike(normalizedSql);

  return {
    sql: normalizedSql,
    params,
  };
}

function hasUnsupportedMySqlConstruct(sql = "") {
  const checks = [
    /\bFILTER\s*\(/i,
    /\-\>\>?/i,
    /\bRETURNING\b/i,
    /\bANY\s*\(\s*\?/i,
    /\bDISTINCT\s+ON\b/i,
  ];

  return checks.some((pattern) => pattern.test(sql));
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

    const filtered = rows.filter((row) =>
      normalizedFilters.every(([key, value]) => {
        if (String(row[key]) === String(value)) {
          return true;
        }

        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        const snakeKey = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
        return String(row[camelKey] ?? row[snakeKey]) === String(value);
      }),
    );

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
    throw new Error("In-memory database adapter does not support raw SQL query.");
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
    const table = quoteIdentifier(tableName, "mysql");
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
    const normalizedParams = Array.isArray(params)
      ? params.map((param) => {
          if (param instanceof Date) {
            return toMysqlUtcDateTime(param);
          }
          if (typeof param === "string") {
            return maybeNormalizeIsoDateTimeString(param);
          }
          return param;
        })
      : params;
    const [result, fields] = await this.pool.query(sql, normalizedParams);
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

function resolveMysqlSslFlag() {
  const raw = String(process.env.MYSQL_SSL ?? "")
    .trim()
    .toLowerCase();
  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }
  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }
  return null;
}

function shouldUseMysqlTls(host, flag) {
  if (flag === true) {
    return true;
  }
  if (flag === false) {
    return false;
  }
  return String(host || "").includes(".mysql.database.azure.com");
}

function createDatabaseConnection({ config, logger }) {
  const explicitClient = String(
    process.env.DATABASE_CLIENT || config?.database?.client || "",
  )
    .trim()
    .toLowerCase();

  if (explicitClient === "mssql") {
    const azure = config?.database?.azureSql;
    const server =
      process.env.AZURE_SQL_SERVER ||
      azure?.server ||
      process.env.DB_HOST;
    const database =
      process.env.AZURE_SQL_DATABASE ||
      azure?.database ||
      process.env.DB_NAME;
    const user =
      process.env.AZURE_SQL_USER ||
      azure?.user ||
      process.env.DB_USER;
    const password =
      process.env.AZURE_SQL_PASSWORD ||
      azure?.password ||
      process.env.DB_PASSWORD;
    const port = Number(
      process.env.AZURE_SQL_PORT ||
        azure?.port ||
        process.env.DB_PORT ||
        1433,
    );

    if (!server || !database || !user || password === undefined) {
      throw new Error(
        "Azure SQL / MSSQL config missing. Set AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_USER, AZURE_SQL_PASSWORD (or DB_*), DATABASE_CLIENT=mssql.",
      );
    }

    const trustCert =
      String(process.env.AZURE_SQL_TRUST_SERVER_CERTIFICATE || "")
        .trim()
        .toLowerCase() === "true" ||
      config?.database?.azureSql?.trustServerCertificate === true;

    const poolConfig = {
      server,
      database,
      user,
      password,
      port,
      options: {
        encrypt: true,
        trustServerCertificate: trustCert,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    logger.info(
      { server, database, port, adapter: "mssql" },
      "Using Azure SQL / MSSQL database adapter.",
    );

    return new MssqlDatabase({ poolConfig, logger });
  }

  const mysqlHost =
    process.env.MYSQL_HOST ||
    process.env.DB_HOST ||
    config?.database?.mysql?.host;
  const mysqlUser =
    process.env.MYSQL_USER ||
    process.env.DB_USER ||
    config?.database?.mysql?.user;
  const mysqlPassword =
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    config?.database?.mysql?.password;
  const mysqlDatabase =
    process.env.MYSQL_DATABASE ||
    process.env.DB_NAME ||
    config?.database?.mysql?.database;
  const mysqlPort =
    Number(process.env.MYSQL_PORT || process.env.DB_PORT || config?.database?.mysql?.port) ||
    3306;
  const allowInMemory =
    process.env.ALLOW_IN_MEMORY_DB === "true" || process.env.NODE_ENV === "test";

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

    const sslFlag = resolveMysqlSslFlag();
    if (shouldUseMysqlTls(mysqlHost, sslFlag)) {
      poolConfig.ssl = {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      };
    }

    logger.info(
      {
        mysqlHost,
        mysqlDatabase,
        mysqlPort,
        mysqlTls: Boolean(poolConfig.ssl),
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

  if (!allowInMemory) {
    throw new Error(
      "MySQL configuration missing. Set MYSQL_HOST/MYSQL_DATABASE (or DB_HOST/DB_NAME).",
    );
  }

  logger.warn(
    "MySQL config missing. Falling back to in-memory adapter because ALLOW_IN_MEMORY_DB=true or NODE_ENV=test.",
  );
  return new InMemoryDatabase();
}

export { createDatabaseConnection, InMemoryDatabase, MySQLDatabase };
