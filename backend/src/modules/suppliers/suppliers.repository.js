function createSuppliersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();

  function canUseRawQuery() {
    return typeof db.query === "function" && db.pool;
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
    const entries = Object.entries(payload).filter(
      ([, value]) => value !== undefined,
    );
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
    logger.debug({ module: "suppliers", payload }, "Creating supplier");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.insert(schema.tableName, sanitized);
  }

  async function update(id, payload) {
    logger.debug({ module: "suppliers", id, payload }, "Updating supplier");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.update(schema.tableName, id, sanitized);
  }

  async function findBookingById(bookingId) {
    if (!bookingId) {
      return null;
    }
    return db.findById(schema.bookingsTable, bookingId);
  }

  async function findPayableById(id) {
    return db.findById(schema.payablesTable, id);
  }

  async function findPayablesBySupplierId(supplierId, filters = {}) {
    const sanitized = await sanitizeForTable(schema.payablesTable, {
      supplier_id: supplierId,
      status: filters.status,
      booking_id: filters.bookingId,
      page: filters.page,
      limit: filters.limit,
    });
    sanitized.supplier_id = supplierId;
    return db.findMany(schema.payablesTable, sanitized);
  }

  async function createPayable(payload) {
    logger.debug({ module: "suppliers", payload }, "Creating supplier payable");
    const sanitized = await sanitizeForTable(schema.payablesTable, payload);
    return db.insert(schema.payablesTable, sanitized);
  }

  async function updatePayable(id, payload) {
    logger.debug(
      { module: "suppliers", id, payload },
      "Updating supplier payable",
    );
    const sanitized = await sanitizeForTable(schema.payablesTable, payload);
    return db.update(schema.payablesTable, id, sanitized);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findBookingById,
    findPayableById,
    findPayablesBySupplierId,
    createPayable,
    updatePayable,
  });
}

export { createSuppliersRepository };
