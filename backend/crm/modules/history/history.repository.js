import { randomUUID } from "node:crypto";

function createHistoryRepository({ db, logger, schema }) {
  async function create(payload) {
    const id = payload.id || randomUUID();
    const row = await db.insert(schema.tableName, {
      id,
      created_at: payload.created_at,
      timezone: payload.timezone,
    });
    return row;
  }

  async function list({ limit = 100 } = {}) {
    const cap = Math.min(500, Math.max(1, Number(limit) || 100));
    if (typeof db.query === "function") {
      const result = await db.query(
        `SELECT * FROM \`${schema.tableName}\` ORDER BY created_at DESC LIMIT ?`,
        [cap],
      );
      return Array.isArray(result.rows) ? result.rows : [];
    }
    const rows = await db.findMany(schema.tableName, {});
    return (Array.isArray(rows) ? rows : []).slice(0, cap);
  }

  return Object.freeze({
    create,
    list,
  });
}

export { createHistoryRepository };
