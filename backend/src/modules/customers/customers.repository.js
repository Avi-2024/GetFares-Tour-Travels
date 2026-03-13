function createCustomersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();

  function canUseRawQuery() {
    return typeof db.query === 'function' && db.pool;
  }

  async function getTableColumns(tableName) {
    if (!canUseRawQuery()) {
      return null;
    }

    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName);
    }

    const result = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [tableName],
    );

    const columns = new Set(result.rows.map((row) => row.column_name));
    tableColumnsCache.set(tableName, columns);
    return columns;
  }

  async function sanitizeForTable(tableName, payload = {}) {
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return {};
    }

    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return Object.fromEntries(entries);
    }

    return Object.fromEntries(entries.filter(([key]) => columns.has(key)));
  }

  async function findAll(filters = {}) {
    const sanitized = await sanitizeForTable(schema.tableName, filters);
    return db.findMany(schema.tableName, sanitized);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: 'customers', payload }, 'Creating record');
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.insert(schema.tableName, sanitized);
  }

  async function update(id, payload) {
    logger.debug({ module: 'customers', id, payload }, 'Updating record');
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.update(schema.tableName, id, sanitized);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
  });
}

module.exports = { createCustomersRepository };
