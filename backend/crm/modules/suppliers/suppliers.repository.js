function createSuppliersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();
  const tableExistsCache = new Map();

  function canUseRawQuery() {
    return typeof db.query === "function" && db.pool;
  }

  async function hasTable(tableName) {
    if (!canUseRawQuery()) {
      return true;
    }
    if (tableExistsCache.has(tableName)) {
      return tableExistsCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableExistsCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableExistsCache.set(tableName, false);
      return false;
    }
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

  async function findPayableDeadlineCandidates({
    limit = 200,
    includeStatuses = ["PENDING", "PARTIAL"],
  } = {}) {
    if (canUseRawQuery()) {
      const params = [includeStatuses];
      let sql = `
        SELECT p.*, s.name AS supplier_name
        FROM ${schema.payablesTable} p
        INNER JOIN ${schema.tableName} s ON s.id = p.supplier_id
        WHERE p.due_date IS NOT NULL
          AND p.status::text = ANY($1::text[])
        ORDER BY p.due_date ASC
      `;
      if (limit) {
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
      }
      const result = await db.query(sql, params);
      return result.rows || [];
    }

    const rows = await db.findMany(schema.payablesTable, {});
    const filtered = rows
      .filter((row) => Boolean(row.due_date ?? row.dueDate))
      .filter((row) =>
        includeStatuses.includes(
          String(row.status || "PENDING").toUpperCase(),
        ),
      )
      .sort((left, right) => {
        const leftDate = Date.parse(left.due_date ?? left.dueDate ?? 0);
        const rightDate = Date.parse(right.due_date ?? right.dueDate ?? 0);
        return leftDate - rightDate;
      });
    return filtered.slice(0, limit);
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

  async function findPayableAlertLog({ payableId, alertType, alertDate } = {}) {
    const tableExists = await hasTable(schema.payableAlertLogsTable);
    if (!tableExists || !payableId || !alertType || !alertDate) {
      return null;
    }
    return db.findOne(schema.payableAlertLogsTable, {
      payable_id: payableId,
      alert_type: alertType,
      alert_date: alertDate,
    });
  }

  async function createPayableAlertLog(payload = {}) {
    const tableExists = await hasTable(schema.payableAlertLogsTable);
    if (!tableExists) {
      return null;
    }
    const sanitized = await sanitizeForTable(schema.payableAlertLogsTable, {
      payable_id: payload.payableId,
      alert_type: payload.alertType,
      alert_date: payload.alertDate,
      triggered_at: payload.triggeredAt || new Date().toISOString(),
      metadata: payload.metadata || {},
    });
    if (!Object.keys(sanitized).length) {
      return null;
    }
    return db.insert(schema.payableAlertLogsTable, sanitized);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findBookingById,
    findPayableById,
    findPayablesBySupplierId,
    findPayableDeadlineCandidates,
    createPayable,
    updatePayable,
    findPayableAlertLog,
    createPayableAlertLog,
  });
}

export { createSuppliersRepository };
