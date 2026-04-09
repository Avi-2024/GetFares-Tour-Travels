function createCustomersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();

  function canUseRawQuery() {
    return (
      typeof db.query === "function" &&
      db.pool &&
      String(db.adapter || "").toLowerCase() === "postgres"
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

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (!columns) {
      return true;
    }
    return columns.has(columnName);
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
      const leadHasSoftDelete = await hasColumn(schema.leadsTable, "is_deleted");
      const quotationHasSoftDelete = await hasColumn(
        schema.quotationsTable,
        "is_deleted",
      );
      const bookingHasSoftDelete = await hasColumn(
        schema.bookingsTable,
        "is_deleted",
      );

      const leadSoftDeleteClause = leadHasSoftDelete
        ? "AND COALESCE(l.is_deleted, FALSE) = FALSE"
        : "";
      const quotationSoftDeleteClause = quotationHasSoftDelete
        ? "AND COALESCE(q.is_deleted, FALSE) = FALSE"
        : "";
      const bookingSoftDeleteClause = bookingHasSoftDelete
        ? "AND COALESCE(b.is_deleted, FALSE) = FALSE"
        : "";

      const query = `
        SELECT
          l.customer_id::text AS customer_id,
          COUNT(DISTINCT b.id)::int AS total_bookings,
          MAX(COALESCE(b.created_at, b.travel_start_date::timestamp)) AS last_booking_date,
          (ARRAY_AGG(
            COALESCE(NULLIF(b.booking_number, ''), b.id::text)
            ORDER BY COALESCE(b.created_at, b.travel_start_date::timestamp) DESC NULLS LAST, b.created_at DESC NULLS LAST
          ))[1] AS last_booking_number
        FROM ${schema.leadsTable} l
        INNER JOIN ${schema.quotationsTable} q ON q.lead_id = l.id
        INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
        WHERE l.customer_id = ANY($1::uuid[])
          ${leadSoftDeleteClause}
          ${quotationSoftDeleteClause}
          ${bookingSoftDeleteClause}
        GROUP BY l.customer_id
      `;

      const result = await db.query(query, [ids]);
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
