import { randomUUID } from "node:crypto";
import sql from "mssql";

const RESERVED_FILTER_KEYS = new Set([
  "page",
  "limit",
  "offset",
  "sort",
  "order",
  "q",
  "search",
]);

function normalizeFilters(filters = {}) {
  return Object.entries(filters).filter(([key, value]) => {
    if (RESERVED_FILTER_KEYS.has(key)) {
      return false;
    }
    return value !== undefined && value !== null && value !== "";
  });
}

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

function quoteIdentifier(name) {
  const s = String(name || "");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) {
    throw new Error(`Unsafe SQL identifier: ${s}`);
  }
  return `[${s.replace(/\]/g, "]]")}]`;
}

function inferParameterType(value) {
  if (value === null || value === undefined) {
    return sql.NVarChar(sql.MAX);
  }
  if (typeof value === "boolean") {
    return sql.Bit;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? sql.Int : sql.Float;
  }
  if (value instanceof Buffer) {
    return sql.VarBinary(sql.MAX);
  }
  if (value instanceof Date) {
    return sql.DateTime2(7);
  }
  return sql.NVarChar(sql.MAX);
}

function bindValueForMssql(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "object" && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function wrapDuplicateKeyError(error) {
  if (error && (error.number === 2627 || error.number === 2601)) {
    const wrapped = new Error(error.message);
    wrapped.code = "23505";
    wrapped.number = error.number;
    return wrapped;
  }
  return error;
}

class MssqlDatabase {
  constructor({ poolConfig, logger }) {
    this.adapter = "mssql";
    this.logger = logger;
    this._poolConfig = poolConfig;
    this._pool = null;
    this._connecting = null;
    this.pool = null;
  }

  async _ensurePool() {
    if (this._pool) {
      return this._pool;
    }
    if (!this._connecting) {
      this._connecting = new sql.ConnectionPool(this._poolConfig)
        .connect()
        .then((pool) => {
          this._pool = pool;
          this.pool = pool;
          return pool;
        })
        .catch((err) => {
          this._connecting = null;
          throw err;
        });
    }
    return this._connecting;
  }

  async query(sqlText, params = []) {
    await this._ensurePool();
    const list = Array.isArray(params) ? params : [];
    let index = 0;
    const text = String(sqlText || "").replace(/\?/g, () => {
      index += 1;
      return `@p${index}`;
    });
    const request = this._pool.request();
    list.forEach((val, idx) => {
      request.input(`p${idx + 1}`, inferParameterType(val), val);
    });
    const result = await request.query(text);
    const rows = result.recordset || [];
    const rowCount =
      typeof result.rowsAffected?.[0] === "number"
        ? result.rowsAffected[0]
        : rows.length;
    return {
      rows,
      rowCount,
      fields: result.columns ? Object.keys(result.columns) : undefined,
    };
  }

  async insert(tableName, payload) {
    await this._ensurePool();
    const table = quoteIdentifier(tableName);
    const id = payload.id || randomUUID();
    const entries = Object.entries({ ...payload, id }).filter(
      ([, value]) => value !== undefined,
    );

    try {
      const columns = entries.map(([col]) => quoteIdentifier(col)).join(", ");
      const placeholders = entries.map((_, i) => `@p${i + 1}`).join(", ");
      const values = entries.map(([, v]) => bindValueForMssql(v));
      const q = `INSERT INTO ${table} (${columns}) OUTPUT INSERTED.* VALUES (${placeholders})`;

      const request = this._pool.request();
      values.forEach((val, idx) => {
        request.input(`p${idx + 1}`, inferParameterType(val), val);
      });
      const result = await request.query(q);
      return result.recordset?.[0] || null;
    } catch (error) {
      throw wrapDuplicateKeyError(error);
    }
  }

  async findById(tableName, id) {
    await this._ensurePool();
    const table = quoteIdentifier(tableName);
    const request = this._pool.request();
    request.input("p1", inferParameterType(id), id);
    const result = await request.query(
      `SELECT TOP (1) * FROM ${table} WHERE ${quoteIdentifier("id")} = @p1`,
    );
    return result.recordset?.[0] || null;
  }

  async findOne(tableName, filters = {}) {
    const rows = await this.findMany(tableName, { ...filters, limit: 1 });
    return rows[0] || null;
  }

  async findMany(tableName, filters = {}) {
    await this._ensurePool();
    const table = quoteIdentifier(tableName);
    const normalizedFilters = normalizeFilters(filters);
    const values = [];

    const whereClause = normalizedFilters
      .map(([key, value]) => {
        values.push(value);
        return `${quoteIdentifier(key)} = @p${values.length}`;
      })
      .join(" AND ");

    let q = `SELECT * FROM ${table}`;
    if (whereClause) {
      q += ` WHERE ${whereClause}`;
    }

    const limit = toPositiveInt(filters.limit);
    const page = toPositiveInt(filters.page);
    const requestedOffset = toNonNegativeInt(filters.offset);
    const offset =
      requestedOffset !== null ? requestedOffset
      : limit && page ? (page - 1) * limit
      : null;

    if (limit) {
      q += ` ORDER BY (SELECT NULL) OFFSET @p${values.length + 1} ROWS FETCH NEXT @p${values.length + 2} ROWS ONLY`;
      values.push(offset !== null ? offset : 0, limit);
    } else if (offset !== null) {
      q += ` ORDER BY (SELECT NULL) OFFSET @p${values.length + 1} ROWS`;
      values.push(offset);
    }

    const request = this._pool.request();
    values.forEach((val, idx) => {
      request.input(`p${idx + 1}`, inferParameterType(val), val);
    });
    const result = await request.query(q);
    return result.recordset || [];
  }

  async update(tableName, id, payload) {
    await this._ensurePool();
    const entries = Object.entries(payload).filter(
      ([key, value]) => key !== "id" && value !== undefined,
    );
    if (!entries.length) {
      return this.findById(tableName, id);
    }

    const table = quoteIdentifier(tableName);
    const setParts = entries.map(
      ([key], idx) => `${quoteIdentifier(key)} = @p${idx + 1}`,
    );
    const values = entries.map(([, v]) => bindValueForMssql(v));
    values.push(id);

    const q = `UPDATE ${table} SET ${setParts.join(", ")} WHERE ${quoteIdentifier("id")} = @p${values.length}`;

    try {
      const request = this._pool.request();
      values.forEach((val, idx) => {
        request.input(`p${idx + 1}`, inferParameterType(val), val);
      });
      await request.query(q);
    } catch (error) {
      throw wrapDuplicateKeyError(error);
    }

    return this.findById(tableName, id);
  }

  async healthCheck({ timeoutMs } = {}) {
    const startedAt = Date.now();
    await this._ensurePool();
    await this.query("SELECT 1 AS ok");
    return {
      ok: true,
      adapter: this.adapter,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    };
  }

  async close() {
    if (this._pool) {
      await this._pool.close();
      this._pool = null;
      this.pool = null;
    }
  }
}

export { MssqlDatabase, sql };
