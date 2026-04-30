function createCustomersRepository({ db, logger, schema }) {
  const tableColumnsCache = new Map();
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 15;
  const MAX_LIMIT = 50;

  function normalizeEmail(value) {
    if (!value) {
      return "";
    }
    return String(value).trim().toLowerCase();
  }

  function normalizePhone(value) {
    if (!value) {
      return "";
    }
    const compact = String(value).trim().replace(/\s+/g, "");
    return compact.replace(/[^\d+]/g, "");
  }

  function canUseRawQuery() {
    return (
      typeof db.query === "function" &&
      (db.adapter === "mysql" || db.adapter === "mssql")
    );
  }

  function toPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  function normalizePagination(filters = {}) {
    const page = toPositiveInt(filters.page, DEFAULT_PAGE);
    const requestedLimit = toPositiveInt(filters.limit, DEFAULT_LIMIT);
    const limit = Math.min(MAX_LIMIT, requestedLimit);
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  function escapeLike(value) {
    return String(value).replace(/[\\%_]/g, "\\$&");
  }

  function normalizeSearchValue(value) {
    return String(value || "").trim();
  }

  function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim(),
    );
  }

  async function getTableColumns(tableName) {
    if (!canUseRawQuery()) {
      return null;
    }

    const cacheKey = String(tableName).toLowerCase();
    if (tableColumnsCache.has(cacheKey)) {
      return tableColumnsCache.get(cacheKey);
    }

    const result = await db.query(
      `SELECT COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`,
      [tableName],
    );

    const columns = new Set(
      (result.rows || []).map((row) =>
        String(row.column_name ?? row.COLUMN_NAME ?? "").toLowerCase(),
      ),
    );
    tableColumnsCache.set(cacheKey, columns);
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

  async function buildListContext(filters = {}) {
    const [customerColumns, leadColumns, quotationColumns, bookingColumns] =
      await Promise.all([
        getTableColumns(schema.tableName),
        getTableColumns(schema.leadsTable),
        getTableColumns(schema.quotationsTable),
        getTableColumns(schema.bookingsTable),
      ]);

    const search = normalizeSearchValue(filters.search);
    const where = ["COALESCE(c.is_deleted, 0) = 0"];
    const params = [];

    if (
      filters.segment &&
      customerColumns?.has("segment")
    ) {
      where.push("c.segment = ?");
      params.push(filters.segment);
    }

    if (
      filters.clientCurrency &&
      customerColumns?.has("client_currency")
    ) {
      where.push("UPPER(COALESCE(c.client_currency, '')) = ?");
      params.push(String(filters.clientCurrency).trim().toUpperCase());
    }

    if (filters.createdFrom && customerColumns?.has("created_at")) {
      where.push("DATE(c.created_at) >= ?");
      params.push(filters.createdFrom);
    }

    if (filters.createdTo && customerColumns?.has("created_at")) {
      where.push("DATE(c.created_at) <= ?");
      params.push(filters.createdTo);
    }

    if (search) {
      const lowered = search.toLowerCase();
      const wildcard = `%${escapeLike(lowered)}%`;
      const compactDigits = lowered.replace(/[^\d+]/g, "");
      const searchClauses = [];

      if (isUuidLike(search)) {
        searchClauses.push("c.id = ?");
        params.push(search);
      }

      if (customerColumns?.has("full_name")) {
        searchClauses.push("LOWER(COALESCE(c.full_name, '')) LIKE ?");
        params.push(wildcard);
      }
      if (customerColumns?.has("email")) {
        searchClauses.push("LOWER(COALESCE(c.email, '')) LIKE ?");
        params.push(wildcard);
      }
      if (customerColumns?.has("phone")) {
        searchClauses.push("LOWER(COALESCE(c.phone, '')) LIKE ?");
        params.push(wildcard);
        if (compactDigits) {
          searchClauses.push(
            "REPLACE(REPLACE(REPLACE(COALESCE(c.phone, ''), ' ', ''), '-', ''), '(', '') LIKE ?",
          );
          params.push(`%${escapeLike(compactDigits)}%`);
        }
      }
      if (customerColumns?.has("pan_number")) {
        searchClauses.push("LOWER(COALESCE(c.pan_number, '')) LIKE ?");
        params.push(wildcard);
      }
      if (customerColumns?.has("address_line")) {
        searchClauses.push("LOWER(COALESCE(c.address_line, '')) LIKE ?");
        params.push(wildcard);
      }
      if (customerColumns?.has("client_currency")) {
        searchClauses.push("LOWER(COALESCE(c.client_currency, '')) LIKE ?");
        params.push(wildcard);
      }

      if (searchClauses.length) {
        where.push(`(${searchClauses.join(" OR ")})`);
      }
    }

    const leadHasCustomerId = leadColumns?.has("customer_id");
    const leadHasSoftDelete = leadColumns?.has("is_deleted");
    const quotationHasLeadId = quotationColumns?.has("lead_id");
    const quotationHasSoftDelete = quotationColumns?.has("is_deleted");
    const bookingHasQuotationId = bookingColumns?.has("quotation_id");
    const bookingHasSoftDelete = bookingColumns?.has("is_deleted");

    const canJoinBookingCounts = Boolean(
      leadHasCustomerId &&
        quotationHasLeadId &&
        bookingHasQuotationId,
    );

    const bookingCountsJoin = canJoinBookingCounts
      ? `
        LEFT JOIN (
          SELECT
            l.customer_id AS customer_id,
            COUNT(DISTINCT b.id) AS total_bookings
          FROM ${schema.leadsTable} l
          INNER JOIN ${schema.quotationsTable} q ON q.lead_id = l.id
          INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          WHERE l.customer_id IS NOT NULL
            ${leadHasSoftDelete ? "AND COALESCE(l.is_deleted, 0) = 0" : ""}
            ${quotationHasSoftDelete ? "AND COALESCE(q.is_deleted, 0) = 0" : ""}
            ${bookingHasSoftDelete ? "AND COALESCE(b.is_deleted, 0) = 0" : ""}
          GROUP BY l.customer_id
        ) booking_counts ON booking_counts.customer_id = c.id
      `
      : "";

    const normalizedSortBy = String(filters.sortBy || "createdAt").trim();
    const normalizedSortOrder =
      String(filters.sortOrder || "desc").trim().toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    let sortExpression = "COALESCE(c.created_at, '1970-01-01 00:00:00')";
    if (normalizedSortBy === "name" && customerColumns?.has("full_name")) {
      sortExpression = "LOWER(COALESCE(c.full_name, ''))";
    } else if (
      normalizedSortBy === "ltv" &&
      customerColumns?.has("lifetime_value")
    ) {
      sortExpression = "COALESCE(c.lifetime_value, 0)";
    } else if (normalizedSortBy === "bookings" && canJoinBookingCounts) {
      sortExpression = "COALESCE(booking_counts.total_bookings, 0)";
    } else if (
      normalizedSortBy === "createdAt" &&
      customerColumns?.has("created_at")
    ) {
      sortExpression = "COALESCE(c.created_at, '1970-01-01 00:00:00')";
    }

    return {
      whereSql: where.join(" AND "),
      params,
      bookingCountsJoin,
      sortSql: `${sortExpression} ${normalizedSortOrder}, c.id ASC`,
      canJoinBookingCounts,
      customerColumns,
    };
  }

  async function findAll(filters = {}) {
    const pagination = normalizePagination(filters);
    const context = await buildListContext(filters);

    if (canUseRawQuery()) {
      const countResult = await db.query(
        `
          SELECT COUNT(*) AS total_count
          FROM ${schema.tableName} c
          WHERE ${context.whereSql}
        `,
        context.params,
      );
      const totalItems = Number(countResult.rows?.[0]?.total_count || 0);
      const rowParams = [...context.params, pagination.limit, pagination.offset];
      const rowsResult = await db.query(
        `
          SELECT
            c.*,
            ${
              context.canJoinBookingCounts
                ? "COALESCE(booking_counts.total_bookings, 0)"
                : "0"
            } AS total_bookings
          FROM ${schema.tableName} c
          ${context.bookingCountsJoin}
          WHERE ${context.whereSql}
          ORDER BY ${context.sortSql}
          LIMIT ?
          OFFSET ?
        `,
        rowParams,
      );

      return {
        items: Array.isArray(rowsResult.rows) ? rowsResult.rows : [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pagination.limit)),
        },
      };
    }

    const sanitized = await sanitizeForTable(schema.tableName, filters);
    const rows = await db.findMany(schema.tableName, sanitized);
    const activeRows = (Array.isArray(rows) ? rows : []).filter(
      (row) => !(row.is_deleted ?? row.isDeleted),
    );
    const search = normalizeSearchValue(filters.search).toLowerCase();
    const filteredRows = activeRows.filter((row) => {
      if (filters.segment && row.segment !== filters.segment) {
        return false;
      }
      if (
        filters.clientCurrency &&
        String(row.client_currency ?? row.clientCurrency ?? "").toUpperCase() !==
          String(filters.clientCurrency).trim().toUpperCase()
      ) {
        return false;
      }
      const createdAt = toDateOnly(row.created_at ?? row.createdAt);
      if (filters.createdFrom && createdAt && createdAt < filters.createdFrom) {
        return false;
      }
      if (filters.createdTo && createdAt && createdAt > filters.createdTo) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = [
        row.id,
        row.full_name,
        row.phone,
        row.email,
        row.pan_number,
        row.address_line,
        row.client_currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
    const normalizedSortBy = String(filters.sortBy || "createdAt");
    const normalizedSortOrder =
      String(filters.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortedRows = filteredRows.slice().sort((left, right) => {
      let comparison = 0;
      if (normalizedSortBy === "name") {
        comparison = String(left.full_name || "").localeCompare(
          String(right.full_name || ""),
        );
      } else if (normalizedSortBy === "ltv") {
        comparison =
          Number(left.lifetime_value || 0) - Number(right.lifetime_value || 0);
      } else {
        comparison =
          new Date(left.created_at || 0).getTime() -
          new Date(right.created_at || 0).getTime();
      }
      if (comparison === 0) {
        comparison = String(left.id || "").localeCompare(String(right.id || ""));
      }
      return comparison * normalizedSortOrder;
    });
    const items = sortedRows.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems: sortedRows.length,
        totalPages: Math.max(1, Math.ceil(sortedRows.length / pagination.limit)),
      },
    };
  }

  async function summarizeList(filters = {}) {
    const context = await buildListContext(filters);

    if (canUseRawQuery()) {
      const result = await db.query(
        `
          SELECT
            COUNT(*) AS total_customers,
            SUM(CASE WHEN c.segment = 'NEW' THEN 1 ELSE 0 END) AS new_customers,
            SUM(CASE WHEN c.segment = 'PLATINUM' THEN 1 ELSE 0 END) AS platinum_customers,
            COALESCE(AVG(COALESCE(c.lifetime_value, 0)), 0) AS average_lifetime_value,
            COALESCE(SUM(${
              context.canJoinBookingCounts
                ? "COALESCE(booking_counts.total_bookings, 0)"
                : "0"
            }), 0) AS total_bookings
          FROM ${schema.tableName} c
          ${context.bookingCountsJoin}
          WHERE ${context.whereSql}
        `,
        context.params,
      );
      const row = result.rows?.[0] || {};
      return {
        totalCustomers: Number(row.total_customers || 0),
        newCustomers: Number(row.new_customers || 0),
        platinumCustomers: Number(row.platinum_customers || 0),
        averageLifetimeValue: Number(row.average_lifetime_value || 0),
        totalBookings: Number(row.total_bookings || 0),
      };
    }

    const listResult = await findAll({ ...filters, page: 1, limit: MAX_LIMIT });
    const items = Array.isArray(listResult.items) ? listResult.items : [];
    return {
      totalCustomers: Number(listResult.pagination?.totalItems || items.length || 0),
      newCustomers: items.filter((row) => row.segment === "NEW").length,
      platinumCustomers: items.filter((row) => row.segment === "PLATINUM").length,
      averageLifetimeValue: items.length
        ? items.reduce(
            (sum, row) => sum + Number(row.lifetime_value ?? row.lifetimeValue ?? 0),
            0,
          ) / items.length
        : 0,
      totalBookings: items.reduce(
        (sum, row) => sum + Number(row.total_bookings ?? 0),
        0,
      ),
    };
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function findLeadsByCustomerId(customerId, customer = {}) {
    if (!customerId) {
      return [];
    }

    if (canUseRawQuery()) {
      const [leadHasCustomerId, leadHasSoftDelete] = await Promise.all([
        hasColumn(schema.leadsTable, "customer_id"),
        hasColumn(schema.leadsTable, "is_deleted"),
      ]);
      const where = [];
      const params = [];

      if (leadHasCustomerId) {
        where.push("l.customer_id = ?");
        params.push(customerId);
      } else {
        const contactClauses = [];
        if (customer.email) {
          contactClauses.push("LOWER(COALESCE(l.email, '')) = LOWER(?)");
          params.push(customer.email);
        }
        if (customer.phone) {
          contactClauses.push("COALESCE(l.phone, '') = ?");
          params.push(customer.phone);
        }
        if (!contactClauses.length) {
          return [];
        }
        where.push(`(${contactClauses.join(" OR ")})`);
      }

      if (leadHasSoftDelete) {
        where.push("COALESCE(l.is_deleted, 0) = 0");
      }

      const result = await db.query(
        `
          SELECT
            l.*,
            d.name AS destination_name,
            u.full_name AS assigned_user_name
          FROM ${schema.leadsTable} l
          LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
          LEFT JOIN ${schema.usersTable} u ON u.id = l.assigned_to
          WHERE ${where.join(" AND ")}
          ORDER BY COALESCE(l.created_at, '1970-01-01 00:00:00') DESC
        `,
        params,
      );

      return Array.isArray(result.rows) ? result.rows : [];
    }

    const rows = await db.findMany(schema.leadsTable, {});
    const normalizedEmail = normalizeEmail(customer.email);
    const normalizedPhone = normalizePhone(customer.phone);
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => !(row?.is_deleted ?? row?.isDeleted ?? false))
      .filter((row) => {
        const rowCustomerId = String(row?.customer_id ?? row?.customerId ?? "");
        if (rowCustomerId && rowCustomerId === String(customerId)) {
          return true;
        }
        const rowEmail = normalizeEmail(row?.email);
        const rowPhone = normalizePhone(row?.phone);
        return Boolean(
          (normalizedEmail && rowEmail === normalizedEmail) ||
            (normalizedPhone && rowPhone === normalizedPhone),
        );
      })
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });
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

  async function backfillFromLeads() {
    const [leadRows, customerRows] = await Promise.all([
      db.findMany(schema.leadsTable, {}),
      db.findMany(schema.tableName, {}),
    ]);

    const existingEmails = new Set();
    const existingPhones = new Set();
    (Array.isArray(customerRows) ? customerRows : []).forEach((row) => {
      if (row?.is_deleted ?? row?.isDeleted ?? false) return;
      const email = normalizeEmail(row?.email);
      const phone = normalizePhone(row?.phone);
      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);
    });

    let created = 0;
    for (const lead of Array.isArray(leadRows) ? leadRows : []) {
      if (lead?.is_deleted ?? lead?.isDeleted ?? false) continue;
      const email = normalizeEmail(lead?.email);
      const phone = normalizePhone(lead?.phone);
      if ((email && existingEmails.has(email)) || (phone && existingPhones.has(phone))) {
        continue;
      }

      const fullName =
        lead?.full_name ??
        lead?.fullName ??
        (email ? email.split("@")[0] : null) ??
        phone ??
        null;

      if (!fullName && !email && !phone) {
        continue;
      }

      const sanitized = await sanitizeForTable(schema.tableName, {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        client_currency: lead?.client_currency ?? lead?.clientCurrency ?? "INR",
      });
      if (!Object.keys(sanitized).length) {
        continue;
      }

      await db.insert(schema.tableName, sanitized);
      created += 1;
      if (email) existingEmails.add(email);
      if (phone) existingPhones.add(phone);
    }

    return created;
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
          ) AS last_booking_number
        FROM ${schema.leadsTable} l
        INNER JOIN ${schema.quotationsTable} q ON q.lead_id = l.id
        INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
        WHERE l.customer_id IN (${placeholders})
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
    summarizeList,
    findById,
    findLeadsByCustomerId,
    create,
    update,
    backfillFromLeads,
    findBookingSummaryByCustomerIds,
  });
}

export { createCustomersRepository };
