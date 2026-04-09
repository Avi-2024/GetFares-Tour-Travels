import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool as PostgresPool } from "pg";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function quoteIdentifier(identifier, dialect = "postgres") {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  if (dialect === "mysql") {
    return `\`${identifier}\``;
  }

  return `"${identifier}"`;
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

function stripPostgresTypeCasts(sql) {
  return sql.replace(
    /::\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\([^)]*\))?/g,
    "",
  );
}

function convertPostgresQuotesToMySql(sql) {
  return sql.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, "`$1`");
}

function normalizePostgresIntervalLiterals(sql) {
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

function normalizePostgresOnConflict(sql) {
  let normalized = String(sql || "");

  if (/\bON\s+CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING\b/i.test(normalized)) {
    normalized = normalized.replace(
      /^\s*INSERT\s+INTO\b/i,
      (match) => match.replace(/\bINSERT\s+INTO\b/i, "INSERT IGNORE INTO"),
    );
    normalized = normalized.replace(
      /\s+ON\s+CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING\b/gi,
      "",
    );
  }

  normalized = normalized.replace(
    /\bON\s+CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET\s+([\s\S]+?)(?=\s+RETURNING\b|$)/gi,
    (_match, setClause = "") => {
      const rewritten = String(setClause).replace(
        /\bEXCLUDED\.([A-Za-z_][A-Za-z0-9_]*)\b/gi,
        "VALUES($1)",
      );
      return `ON DUPLICATE KEY UPDATE ${rewritten}`;
    },
  );

  return normalized;
}

function extractParamIndexes(sqlFragment = "") {
  const indexes = [];
  sqlFragment.replace(/\$([0-9]+)/g, (_, idx) => {
    indexes.push(Number(idx));
    return "";
  });
  return indexes;
}

function pickParamsByIndexes(params = [], indexes = []) {
  return indexes.map((idx) => params[idx - 1]);
}

function replacePostgresPlaceholders(sql, params = []) {
  const orderedParams = [];
  const replacedSql = String(sql || "").replace(/\$([0-9]+)/g, (_, rawIndex) => {
    const index = Number(rawIndex) - 1;
    orderedParams.push(params[index]);
    return "?";
  });

  if (!orderedParams.length) {
    return { sql: replacedSql, params };
  }

  return { sql: replacedSql, params: orderedParams };
}

function normalizePostgresSqlForMySql(sql, params = []) {
  let normalizedSql = String(sql || "");
  normalizedSql = stripPostgresTypeCasts(normalizedSql);
  normalizedSql = convertPostgresQuotesToMySql(normalizedSql);
  normalizedSql = normalizePostgresIntervalLiterals(normalizedSql);
  normalizedSql = normalizeTableSchemaPublic(normalizedSql);
  normalizedSql = normalizePostgresOnConflict(normalizedSql);
  normalizedSql = normalizedSql.replace(/\bILIKE\b/gi, "LIKE");
  normalizedSql = normalizedSql.replace(
    /=\s*ANY\(\s*\$([0-9]+)\s*\)/gi,
    "IN ($1)",
  );

  const placeholderNormalized = replacePostgresPlaceholders(normalizedSql, params);
  const sqlWithAny = placeholderNormalized.sql.replace(
    /=\s*ANY\(\s*\?\s*\)/gi,
    "IN (?)",
  );

  return {
    sql: sqlWithAny,
    params: placeholderNormalized.params,
  };
}

function hasUnsupportedMySqlConstruct(sql = "") {
  const checks = [
    /\bDATE_TRUNC\s*\(/i,
    /\bFILTER\s*\(/i,
    /\bjsonb_[a-z_]+\s*\(/i,
    /'[^']*'::jsonb/i,
    /\-\>\>?/i,
    /\bpg_try_advisory_lock\s*\(/i,
    /\bpg_advisory_unlock\s*\(/i,
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
    const nowIso = new Date().toISOString();
    const createdAt = payload.created_at || payload.createdAt || nowIso;

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

    const nowIso = new Date().toISOString();
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

class PostgresDatabase {
  constructor({ pool }) {
    this.pool = pool;
    this.adapter = "postgres";
  }

  async insert(tableName, payload) {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    const table = quoteIdentifier(tableName, "postgres");

    if (!entries.length) {
      const result = await this.pool.query(
        `INSERT INTO ${table} DEFAULT VALUES RETURNING *`,
      );
      return result.rows[0] || null;
    }

    const columns = entries.map(([column]) => quoteIdentifier(column, "postgres")).join(", ");
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);

    const result = await this.pool.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  async findById(tableName, id) {
    const table = quoteIdentifier(tableName, "postgres");
    const result = await this.pool.query(
      `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findOne(tableName, filters = {}) {
    const rows = await this.findMany(tableName, { ...filters, limit: 1 });
    return rows[0] || null;
  }

  async findMany(tableName, filters = {}) {
    const table = quoteIdentifier(tableName, "postgres");
    const normalizedFilters = normalizeFilters(filters);
    const values = [];

    const whereClause = normalizedFilters
      .map(([key, value], index) => {
        values.push(value);
        return `${quoteIdentifier(key, "postgres")} = $${index + 1}`;
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
    const entries = Object.entries(payload).filter(
      ([key, value]) => key !== "id" && value !== undefined,
    );
    if (!entries.length) {
      return this.findById(tableName, id);
    }

    const table = quoteIdentifier(tableName, "postgres");
    const values = entries.map(([, value]) => value);
    const setClause = entries
      .map(([key], index) => `${quoteIdentifier(key, "postgres")} = $${index + 1}`)
      .join(", ");

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
      () => this.pool.query("SELECT 1"),
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
    const normalized = normalizePostgresSqlForMySql(sql, params);
    if (hasUnsupportedMySqlConstruct(normalized.sql)) {
      throw new Error(
        `Unsupported PostgreSQL SQL construct for MySQL adapter. Query must be rewritten: ${normalizeRawSql(
          sql,
        ).slice(0, 220)}`,
      );
    }

    return this.pool.query(normalized.sql, normalized.params);
  }

  async runSelect(sql, params = []) {
    const [rows] = await this.runQuery(sql, params);
    return Array.isArray(rows) ? rows : [];
  }

  async tryReturningCompatibility(sql, params = []) {
    const normalizedSql = normalizeRawSql(sql);
    if (!/\bRETURNING\b/i.test(normalizedSql)) {
      return null;
    }

    const toSelectColumns = (returningClause) => {
      const trimmed = String(returningClause || "").trim();
      if (!trimmed || trimmed === "*") {
        return "*";
      }
      return trimmed;
    };

    const deleteMatch = normalizedSql.match(
      /^\s*DELETE\s+FROM\s+([^\s]+)\s+WHERE\s+([\s\S]+?)\s+RETURNING\s+([\s\S]+)\s*$/i,
    );
    if (deleteMatch) {
      const table = deleteMatch[1];
      const whereClause = deleteMatch[2];
      const returningClause = toSelectColumns(deleteMatch[3]);
      const whereParamIndexes = extractParamIndexes(whereClause);
      const whereParams = pickParamsByIndexes(params, whereParamIndexes);
      const beforeRows = await this.runSelect(
        `SELECT ${returningClause} FROM ${table} WHERE ${whereClause}`,
        whereParams,
      );
      await this.runQuery(`DELETE FROM ${table} WHERE ${whereClause}`, whereParams);
      return { rows: beforeRows, rowCount: beforeRows.length };
    }

    const updateMatch = normalizedSql.match(
      /^\s*UPDATE\s+([^\s]+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+?)\s+RETURNING\s+([\s\S]+)\s*$/i,
    );
    if (updateMatch) {
      const table = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      const returningClause = toSelectColumns(updateMatch[4]);
      await this.runQuery(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`, params);

      const whereParamIndexes = extractParamIndexes(whereClause);
      const whereParams = pickParamsByIndexes(params, whereParamIndexes);
      const rows = await this.runSelect(
        `SELECT ${returningClause} FROM ${table} WHERE ${whereClause}`,
        whereParams,
      );
      return { rows, rowCount: rows.length };
    }

    const insertMatch = normalizedSql.match(
      /^\s*INSERT\s+INTO\s+([^\s(]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)\s*RETURNING\s+([\s\S]+)\s*$/i,
    );
    if (insertMatch) {
      const table = insertMatch[1];
      const columns = insertMatch[2]
        .split(",")
        .map((item) => item.trim().replace(/^["`]|["`]$/g, ""));
      const valuesFragment = insertMatch[3];
      const returningClause = toSelectColumns(insertMatch[4]);
      const valueParamIndexes = extractParamIndexes(valuesFragment);
      const [insertResult] = await this.runQuery(
        `INSERT INTO ${table} (${insertMatch[2]}) VALUES (${valuesFragment})`,
        params,
      );

      const idColumnIndex = columns.findIndex((item) => item === "id");
      if (idColumnIndex >= 0 && valueParamIndexes[idColumnIndex]) {
        const idValue = params[valueParamIndexes[idColumnIndex] - 1];
        if (idValue) {
          const rows = await this.runSelect(
            `SELECT ${returningClause} FROM ${table} WHERE id = $1`,
            [idValue],
          );
          return { rows, rowCount: rows.length };
        }
      }

      const insertId = insertResult?.insertId;
      if (insertId !== undefined && insertId !== null && insertId !== 0) {
        const rows = await this.runSelect(
          `SELECT ${returningClause} FROM ${table} WHERE id = $1`,
          [insertId],
        );
        if (rows.length > 0) {
          return { rows, rowCount: rows.length };
        }
      }

      return { rows: [], rowCount: 0 };
    }

    throw new Error(
      `Unsupported RETURNING query for MySQL adapter. Rewrite query manually: ${normalizedSql.slice(
        0,
        220,
      )}`,
    );
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
        await this.runQuery(`INSERT INTO ${table} (id) VALUES ($1)`, [idValue]);
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
        return `${quoteIdentifier(key, "mysql")} = ?`;
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
      values.push(limit);
      query += " LIMIT ?";
    }

    if (offset !== null) {
      values.push(offset);
      query += " OFFSET ?";
    }

    const [rows] = await this.pool.query(query, values);
    return rows || [];
  }

  async update(tableName, id, payload) {
    const entries = Object.entries(payload).filter(
      ([key, value]) => key !== "id" && value !== undefined,
    );
    if (!entries.length) {
      return this.findById(tableName, id);
    }

    const table = quoteIdentifier(tableName, "mysql");
    const values = entries.map(([, value]) => value);
    const setClause = entries
      .map(([key]) => `${quoteIdentifier(key, "mysql")} = ?`)
      .join(", ");

    values.push(id);
    await this.pool.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);

    return this.findById(tableName, id);
  }

  async query(sql, params = []) {
    const returningResult = await this.tryReturningCompatibility(sql, params).catch(
      (error) => {
        this.logger?.warn?.(
          { err: error, module: "database", adapter: "mysql" },
          "MySQL RETURNING compatibility fallback failed.",
        );
        throw error;
      },
    );

    if (returningResult) {
      return returningResult;
    }

    const [result] = await this.runQuery(sql, params);
    if (Array.isArray(result)) {
      return { rows: result, rowCount: result.length };
    }

    return {
      rows: [],
      rowCount: Number(result?.affectedRows || 0),
      insertId: result?.insertId ?? null,
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

function detectDatabaseClient(config = {}) {
  const explicit = String(config.database?.client || "")
    .trim()
    .toLowerCase();
  if (explicit === "mysql" || explicit === "mariadb") {
    return "mysql";
  }
  if (explicit === "postgres" || explicit === "postgresql" || explicit === "pg") {
    return "postgres";
  }

  const url = String(config.database?.url || "").trim().toLowerCase();
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
    return "mysql";
  }
  return "postgres";
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

  if (dbClient === "mysql") {
    const poolConfig = createMySqlPoolConfig({ config });
    if (!poolConfig) {
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

  if (config.database.url) {
    const sslRejectUnauthorizedOverride =
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
    const sslCaOverride = process.env.DATABASE_SSL_CA;
    const sslCaPathOverride = process.env.DATABASE_SSL_CA_PATH;

    const isServerless =
      process.env.VERCEL === "1" || process.env.AWS_EXECUTION_ENV;
    const isProduction = config.env === "production";
    const isAWSRDS =
      config.database.url.includes(".rds.") ||
      config.database.url.includes(".rds-");

    const poolConfig = {
      connectionString: config.database.url,
      max: isServerless ? 2 : 10,
      idleTimeoutMillis: isServerless ? 20000 : 30000,
      connectionTimeoutMillis: isServerless ? 7000 : 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 60000,
      query_timeout: 60000,
      options: "-c timezone=Asia/Kolkata",
    };

    if (isAWSRDS) {
      if (isProduction) {
        const fallbackCaPath = path.resolve(
          __dirname,
          "../../..",
          "global-bundle.pem",
        );
        const caPath = sslCaPathOverride || fallbackCaPath;

        if (sslCaOverride) {
          poolConfig.ssl = {
            rejectUnauthorized: true,
            ca: sslCaOverride.replace(/\\n/g, "\n"),
          };
        } else if (fs.existsSync(caPath)) {
          poolConfig.ssl = {
            rejectUnauthorized: true,
            ca: fs.readFileSync(caPath, "utf8"),
          };
        } else {
          poolConfig.ssl = { rejectUnauthorized: false };
          logger.warn(
            { caPath },
            "RDS CA bundle not found. Falling back to rejectUnauthorized=false.",
          );
        }
      } else {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
    }

    if (sslRejectUnauthorizedOverride === "false") {
      const current = poolConfig.ssl && poolConfig.ssl !== true ? poolConfig.ssl : {};
      poolConfig.ssl = { ...current, rejectUnauthorized: false };
    }

    logger.info(
      {
        databaseUrlConfigured: true,
        isServerless,
        isAWSRDS,
        sslEnabled: !!poolConfig.ssl,
        adapter: "postgres",
        poolConfig: {
          max: poolConfig.max,
          idleTimeoutMillis: poolConfig.idleTimeoutMillis,
          connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        },
      },
      "Using PostgreSQL database adapter.",
    );
    const pool = new PostgresPool(poolConfig);
    pool.on("error", (error) => {
      logger.error({ err: error }, "Unexpected PostgreSQL pool error");
    });
    return new PostgresDatabase({ pool });
  }

  logger.warn("DATABASE_URL is not set. Falling back to in-memory adapter.");
  return new InMemoryDatabase();
}

export {
  createDatabaseConnection,
  InMemoryDatabase,
  PostgresDatabase,
  MySqlDatabase,
};
