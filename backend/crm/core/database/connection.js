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

<<<<<<< HEAD
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
=======
function quoteIdentifier(identifier, dialect = "mysql") {
>>>>>>> development
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

<<<<<<< HEAD
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
=======
  if (dialect === "mysql") {
    return `\`${identifier}\``;
  }

  return `\`${identifier}\``;
>>>>>>> development
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
<<<<<<< HEAD
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(now).toISOString();
    const createdAt = payload.created_at || payload.createdAt || istDate;
=======
    const nowIso = new Date().toISOString();
    const createdAt = payload.created_at || payload.createdAt || nowIso;
>>>>>>> development

    const row = {
      ...payload,
      id: payload.id || randomUUID(),
      created_at: createdAt,
      createdAt,
      updated_at: nowIso,
      updatedAt: nowIso,
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

<<<<<<< HEAD
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(now).toISOString();
=======
    const nowIso = new Date().toISOString();
>>>>>>> development
    const updated = {
      ...existing,
      ...payload,
      id,
      updated_at: nowIso,
      updatedAt: nowIso,
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

<<<<<<< HEAD
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
=======
class MySqlDatabase {
  constructor({ pool, logger }) {
    this.pool = pool;
    this.logger = logger;
    this.adapter = "mysql";
    this.columnCache = new Map();
  }

  async hasColumn(tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;
    if (this.columnCache.has(cacheKey)) {
      return this.columnCache.get(cacheKey);
    }

    const sql = `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `;

    const [rows] = await this.pool.query(sql, [tableName, columnName]);
    const exists = Array.isArray(rows) && rows.length > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  async runQuery(sql, params = []) {
    const normalized = normalizeSqlForMySql(sql, params);
    if (hasUnsupportedMySqlConstruct(normalized.sql)) {
      throw new Error(
        `Unsupported SQL construct for MySQL adapter. Query must be rewritten: ${normalizeRawSql(
          sql,
        ).slice(0, 220)}`,
      );
    }

    if (process.env.CRM_SQL_DEBUG === "1" && this.logger?.debug) {
      this.logger.debug(
        {
          sql: normalizeRawSql(normalized.sql).slice(0, 900),
          paramCount: Array.isArray(normalized.params)
            ? normalized.params.length
            : 0,
        },
        "crm mysql query",
      );
    }

    return this.pool.query(normalized.sql, normalized.params);
  }

  async runSelect(sql, params = []) {
    const [rows] = await this.runQuery(sql, params);
    return Array.isArray(rows) ? rows : [];
  }

  async insert(tableName, payload) {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    const table = quoteIdentifier(tableName, "mysql");
    let finalEntries = entries;

    const hasIdColumn = await this.hasColumn(tableName, "id");
    const includesId = entries.some(([column]) => column === "id");
    if (hasIdColumn && !includesId) {
      finalEntries = [["id", randomUUID()], ...entries];
    }

    if (!finalEntries.length) {
      const idValue = hasIdColumn ? randomUUID() : null;
      if (idValue) {
        await this.runQuery(`INSERT INTO ${table} (id) VALUES (?)`, [idValue]);
        return this.findById(tableName, idValue);
      }
      await this.runQuery(`INSERT INTO ${table} () VALUES ()`, []);
      return null;
    }

    const columns = finalEntries.map(([column]) => quoteIdentifier(column, "mysql")).join(", ");
    const placeholders = finalEntries.map(() => "?").join(", ");
    const values = finalEntries.map(([, value]) => value);

    await this.pool.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);

    const idValue = finalEntries.find(([column]) => column === "id")?.[1];
    if (idValue) {
      return this.findById(tableName, idValue);
    }

    return null;
  }

  async findById(tableName, id) {
    const table = quoteIdentifier(tableName, "mysql");
    const [rows] = await this.pool.query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return rows?.[0] || null;
>>>>>>> development
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
<<<<<<< HEAD
        return `${quoteIdentifier(key)} = ?`;
=======
        return `${quoteIdentifier(key, "mysql")} = ?`;
>>>>>>> development
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
<<<<<<< HEAD
=======
      query += " LIMIT ?";
>>>>>>> development
    }

    if (offset !== null) {
      query += ` OFFSET ?`;
      values.push(offset);
<<<<<<< HEAD
    }

    const [rows] = await this.pool.query(query, values);
    return rows;
=======
      query += " OFFSET ?";
    }

    const [rows] = await this.pool.query(query, values);
    return rows || [];
>>>>>>> development
  }

  async update(tableName, id, payload) {
    const entries = Object.entries(payload).filter(
      ([key, value]) => key !== "id" && value !== undefined,
    );
    if (!entries.length) {
      return this.findById(tableName, id);
    }

<<<<<<< HEAD
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
=======
    const table = quoteIdentifier(tableName, "mysql");
    const values = entries.map(([, value]) => value);
    const setClause = entries
      .map(([key]) => `${quoteIdentifier(key, "mysql")} = ?`)
      .join(", ");

    values.push(id);
    await this.pool.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
>>>>>>> development

    return this.findById(tableName, id);
  }

  async query(sql, params = []) {
<<<<<<< HEAD
    const [result, fields] = await this.pool.query(sql, params);
    const rows = Array.isArray(result) ? result : [];
    return {
      rows,
      rowCount: Array.isArray(result) ? result.length : (result?.affectedRows ?? 0),
      fields,
=======
    const [result] = await this.runQuery(sql, params);
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length };
    }

    return {
      rows: [],
      rowCount: Number(result?.affectedRows || 0),
      insertId: result?.insertId ?? null,
>>>>>>> development
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

<<<<<<< HEAD
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
=======
function detectDatabaseClient(config = {}) {
  const explicit = String(config.database?.client || "")
    .trim()
    .toLowerCase();
  if (explicit === "mysql" || explicit === "mariadb") {
    return "mysql";
  }

  const url = String(config.database?.url || "").trim().toLowerCase();
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
    return "mysql";
  }
  return "mysql";
}

function parseMysqlUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database: decodeURIComponent((parsed.pathname || "").replace(/^\//, "")),
  };
}

function createMySqlPoolConfig({ config }) {
  const url = String(config.database?.url || "").trim();
  const useUrl = /^mysql(2)?:\/\//i.test(url);

  const base =
    useUrl ? parseMysqlUrl(url)
    : {
        host: config.database?.mysql?.host,
        port: config.database?.mysql?.port || 3306,
        user: config.database?.mysql?.user,
        password: config.database?.mysql?.password,
        database: config.database?.mysql?.database,
      };

  if (!base.host || !base.user || !base.database) {
    return null;
  }

  const sslRejectUnauthorizedOverride =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  let ssl;
  if (sslRejectUnauthorizedOverride === "false") {
    ssl = { rejectUnauthorized: false };
  } else if (process.env.DATABASE_SSL_CA) {
    ssl = {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
    };
  }

  return {
    host: base.host,
    port: base.port,
    user: base.user,
    password: base.password,
    database: base.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
    ssl,
  };
}

function createDatabaseConnection({ config, logger }) {
  if (!config.database.url && !config.database?.mysql?.host) {
    logger.warn("Database config is not set. Falling back to in-memory adapter.");
    return new InMemoryDatabase();
  }

  const dbClient = detectDatabaseClient(config);
  if (dbClient !== "mysql") {
    logger.warn(
      { configuredClient: config.database?.client || null },
      "Only MySQL adapter is supported. Falling back to in-memory adapter.",
    );
    return new InMemoryDatabase();
  }

  const poolConfig = createMySqlPoolConfig({ config });
  if (!poolConfig) {
    const rawUrl = String(config.database?.url || "").trim();
    if (/^postgres(ql)?:/i.test(rawUrl)) {
      logger.warn(
        "DATABASE_URL is still a postgres URL. MySQL adapter never reads it. Use mysql:// or mysql2:// in DATABASE_URL, or set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.",
      );
    }
    logger.warn(
      "MySQL client selected but connection settings are incomplete. Falling back to in-memory adapter.",
    );
    return new InMemoryDatabase();
  }

  logger.info(
    {
      databaseUrlConfigured: Boolean(config.database.url),
      adapter: "mysql",
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
    },
    "Using MySQL database adapter.",
  );

  const pool = mysql.createPool(poolConfig);
  return new MySqlDatabase({ pool, logger });
}

export {
  createDatabaseConnection,
  InMemoryDatabase,
  MySqlDatabase,
};
>>>>>>> development
