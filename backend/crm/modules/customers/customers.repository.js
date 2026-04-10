function createCustomersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();

  function canUseRawQuery() {
    return (
      typeof db.query === "function" &&
<<<<<<< HEAD
      (db.adapter === "mysql" || Boolean(db.pool))
=======
      db.pool
>>>>>>> development
    );
  }

  async function getTableColumns(tableName) {
    if (!canUseRawQuery()) {
      return null;
    }

    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName);
    }

    const result = await db.query(
<<<<<<< HEAD
      `SELECT COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
=======
      `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
>>>>>>> development
      [tableName],
    );

    const columns = new Set(
      (result.rows || []).map((row) =>
        String(row.column_name ?? row.COLUMN_NAME ?? "").toLowerCase(),
      ),
    );
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

    return Object.fromEntries(
      entries.filter(([key]) => columns.has(String(key).toLowerCase())),
    );
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (!columns) {
      return false;
    }
    return columns.has(String(columnName).toLowerCase());
  }

  function toDateOnly(value) {
    if (!value) return null;

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function findAll(filters = {}) {
    const sanitized = await sanitizeForTable(schema.tableName, filters);
    return db.findMany(schema.tableName, sanitized);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: "customers", payload }, "Creating record");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.insert(schema.tableName, sanitized);
  }

  async function update(id, payload) {
    logger.debug({ module: "customers", id, payload }, "Updating record");
    const sanitized = await sanitizeForTable(schema.tableName, payload);
    return db.update(schema.tableName, id, sanitized);
  }

  async function findBookingSummaryByCustomerIds(customerIds = []) {
    const ids = [...new Set(customerIds.filter(Boolean).map(String))];
    if (!ids.length) {
      return new Map();
    }

    if (canUseRawQuery()) {
      const [leadHasCustomerId, leadHasSoftDelete, quotationHasSoftDelete, bookingHasSoftDelete] =
        await Promise.all([
          hasColumn(schema.leadsTable, "customer_id"),
          hasColumn(schema.leadsTable, "is_deleted"),
          hasColumn(schema.quotationsTable, "is_deleted"),
          hasColumn(schema.bookingsTable, "is_deleted"),
        ]);

      if (!leadHasCustomerId) {
        return new Map();
      }

      const leadSoftDeleteClause = leadHasSoftDelete
        ? "AND COALESCE(l.is_deleted, 0) = 0"
        : "";
      const quotationSoftDeleteClause = quotationHasSoftDelete
        ? "AND COALESCE(q.is_deleted, 0) = 0"
        : "";
      const bookingSoftDeleteClause = bookingHasSoftDelete
        ? "AND COALESCE(b.is_deleted, 0) = 0"
        : "";
      const bookingSubDeleteClause = bookingHasSoftDelete
        ? "AND COALESCE(b2.is_deleted, 0) = 0"
        : "";

      const placeholders = ids.map(() => "?").join(", ");
      const query = `
        SELECT
<<<<<<< HEAD
          CONVERT(l.customer_id, CHAR) AS customer_id,
          COUNT(DISTINCT b.id) AS total_bookings,
          MAX(COALESCE(b.created_at, b.travel_start_date)) AS last_booking_date,
          (
            SELECT COALESCE(NULLIF(b2.booking_number, ''), CONVERT(b2.id, CHAR))
            FROM ${schema.bookingsTable} b2
            INNER JOIN ${schema.quotationsTable} q2 ON q2.id = b2.quotation_id
            WHERE q2.lead_id = l.id
              ${bookingSubDeleteClause}
            ORDER BY COALESCE(b2.created_at, b2.travel_start_date) DESC
            LIMIT 1
=======
          l.customer_id AS customer_id,
          COUNT(DISTINCT b.id) AS total_bookings,
          MAX(COALESCE(b.created_at, b.travel_start_date)) AS last_booking_date,
          SUBSTRING_INDEX(
            GROUP_CONCAT(
              COALESCE(NULLIF(b.booking_number, ''), b.id)
              ORDER BY COALESCE(b.created_at, b.travel_start_date) DESC, b.created_at DESC
              SEPARATOR ','
            ),
            ',',
            1
>>>>>>> development
          ) AS last_booking_number
        FROM ${schema.leadsTable} l
        INNER JOIN ${schema.quotationsTable} q ON q.lead_id = l.id
        INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
<<<<<<< HEAD
        WHERE l.customer_id IN (${placeholders})
=======
        WHERE l.customer_id IN (?)
>>>>>>> development
          ${leadSoftDeleteClause}
          ${quotationSoftDeleteClause}
          ${bookingSoftDeleteClause}
        GROUP BY l.customer_id
      `;

      try {
        const result = await db.query(query, ids);
        const summaryMap = new Map();
        result.rows.forEach((row) => {
          const customerId = String(row.customer_id || "");
          if (!customerId) return;
          summaryMap.set(customerId, {
            totalBookings: Number(row.total_bookings || 0),
            lastBookingDate: toDateOnly(row.last_booking_date),
            lastBookingNumber: row.last_booking_number || null,
          });
        });
        return summaryMap;
      } catch (_err) {
        // Fall through to in-memory fallback
      }
    }

    const [leadRows, quotationRows, bookingRows] = await Promise.all([
      db.findMany(schema.leadsTable, {}),
      db.findMany(schema.quotationsTable, {}),
      db.findMany(schema.bookingsTable, {}),
    ]);

    const idSet = new Set(ids);
    const leadToCustomerId = new Map();
    (Array.isArray(leadRows) ? leadRows : []).forEach((row) => {
      if (row?.is_deleted ?? row?.isDeleted ?? false) return;
      const customerId = String(row?.customer_id ?? row?.customerId ?? "");
      const leadId = String(row?.id ?? "");
      if (!customerId || !leadId || !idSet.has(customerId)) return;
      leadToCustomerId.set(leadId, customerId);
    });

    const quotationToCustomerId = new Map();
    (Array.isArray(quotationRows) ? quotationRows : []).forEach((row) => {
      if (row?.is_deleted ?? row?.isDeleted ?? false) return;
      const quotationId = String(row?.id ?? "");
      const leadId = String(row?.lead_id ?? row?.leadId ?? "");
      if (!quotationId || !leadId) return;
      const customerId = leadToCustomerId.get(leadId);
      if (!customerId) return;
      quotationToCustomerId.set(quotationId, customerId);
    });

    const summaryMap = new Map();
    (Array.isArray(bookingRows) ? bookingRows : []).forEach((row) => {
      if (row?.is_deleted ?? row?.isDeleted ?? false) return;

      const quotationId = String(row?.quotation_id ?? row?.quotationId ?? "");
      const bookingId = String(row?.id ?? "");
      const customerId = quotationToCustomerId.get(quotationId);
      if (!quotationId || !bookingId || !customerId) return;

      const bookingNumber = String(
        row?.booking_number ?? row?.bookingNumber ?? bookingId,
      );
      const bookingDateRaw =
        row?.created_at ??
        row?.createdAt ??
        row?.travel_start_date ??
        row?.travelStartDate ??
        null;
      const bookingTimestamp = bookingDateRaw
        ? new Date(bookingDateRaw).getTime()
        : Number.NaN;
      const bookingDate = toDateOnly(bookingDateRaw);

      if (!summaryMap.has(customerId)) {
        summaryMap.set(customerId, {
          totalBookings: 0,
          lastBookingDate: null,
          lastBookingNumber: null,
          bookingIds: new Set(),
          lastBookingTimestamp: Number.NEGATIVE_INFINITY,
        });
      }

      const summary = summaryMap.get(customerId);
      if (!summary.bookingIds.has(bookingId)) {
        summary.totalBookings += 1;
        summary.bookingIds.add(bookingId);
      }

      if (Number.isFinite(bookingTimestamp)) {
        if (bookingTimestamp >= summary.lastBookingTimestamp) {
          summary.lastBookingTimestamp = bookingTimestamp;
          summary.lastBookingDate = bookingDate;
          summary.lastBookingNumber = bookingNumber || null;
        }
      } else if (!summary.lastBookingNumber) {
        summary.lastBookingNumber = bookingNumber || null;
      }
    });

    summaryMap.forEach((value, key) => {
      summaryMap.set(key, {
        totalBookings: Number(value.totalBookings || 0),
        lastBookingDate: value.lastBookingDate || null,
        lastBookingNumber: value.lastBookingNumber || null,
      });
    });

    return summaryMap;
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findBookingSummaryByCustomerIds,
  });
}

export { createCustomersRepository };
