function createBookingsRepository({ db, logger, schema }) {
  const tableCache = new Map();
  const columnCache = new Map();
  const BOOKING_JSON_COLUMNS = new Set([
    "supplier_details",
    "dmc_details",
    "hotel_segments",
    "flight_segments",
    "insurance_details",
    "other_services",
  ]);
  const DEADLINE_ALERT_LOG_JSON_COLUMNS = new Set(["metadata"]);

  function canIntrospect() {
    return (
      typeof db.query === "function" &&
      (db.adapter === "mysql" || db.adapter === "mssql")
    );
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toBoolean(value, fallback = false) {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }

    return Boolean(value);
  }

  function toDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  function toJson(value, fallback = null) {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === "object") {
      return value;
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (_error) {
        return fallback;
      }
    }
    return fallback;
  }

  function toDatabaseJsonValue(value) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return value;
      } catch (_error) {
        return JSON.stringify(value);
      }
    }
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return JSON.stringify(null);
    }
  }

  function serializeJsonColumns(payload = {}, columns = new Set()) {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const result = { ...payload };
    columns.forEach((column) => {
      if (Object.prototype.hasOwnProperty.call(result, column)) {
        result[column] = toDatabaseJsonValue(result[column]);
      }
    });

    return result;
  }

  function toUserDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      email: row.email ?? null,
    };
  }

  function toBooking(
    row,
    userMap = new Map(),
    leadIdMap = new Map(),
    leadCurrencyMap = new Map(),
    leadCountryMap = new Map(),
  ) {
    if (!row) {
      return null;
    }

    const createdBy = row.created_by ?? row.createdBy ?? null;
    const quotationId = row.quotation_id ?? row.quotationId ?? null;
    const createdByUser =
      userMap.get(createdBy) || row.createdByUser || null;
    const derivedLeadId =
      row.lead_id ??
      row.leadId ??
      row.joined_lead_id ??
      leadIdMap.get(quotationId) ??
      null;

    return {
      id: row.id,
      quotationId,
      leadId: derivedLeadId,
      bookingNumber: row.booking_number ?? row.bookingNumber ?? null,
      travelStartDate: row.travel_start_date ?? row.travelStartDate ?? null,
      travelEndDate: row.travel_end_date ?? row.travelEndDate ?? null,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      costAmount: toNumber(row.cost_amount ?? row.costAmount, 0),
      profitAmount: toNumber(row.profit_amount ?? row.profitAmount, 0),
      status: row.status ?? "PENDING",
      paymentStatus: row.payment_status ?? row.paymentStatus ?? "PENDING",
      advanceRequired: toNumber(row.advance_required ?? row.advanceRequired, 0),
      advanceReceived: toNumber(row.advance_received ?? row.advanceReceived, 0),
      clientCurrency:
        row.joined_client_currency ??
        (derivedLeadId ? leadCurrencyMap.get(derivedLeadId) : null) ??
        null,
      leadCountry:
        row.joined_lead_country ??
        (derivedLeadId ? leadCountryMap.get(String(derivedLeadId)) : null) ??
        row.lead_country ??
        row.leadCountry ??
        null,
      supplierCurrency: row.supplier_currency ?? row.supplierCurrency ?? null,
      exchangeRate:
        row.exchange_rate !== undefined
          ? toNumber(row.exchange_rate ?? row.exchangeRate, null)
          : null,
      exchangeLocked: toBoolean(
        row.exchange_locked ?? row.exchangeLocked,
        false,
      ),
      supplierDetails: toJson(
        row.supplier_details ?? row.supplierDetails,
        {},
      ),
      dmcDetails: toJson(row.dmc_details ?? row.dmcDetails, {}),
      hotelSegments: toJson(row.hotel_segments ?? row.hotelSegments, []),
      flightSegments: toJson(row.flight_segments ?? row.flightSegments, []),
      insuranceDetails: toJson(
        row.insurance_details ?? row.insuranceDetails,
        {},
      ),
      otherServices: toJson(row.other_services ?? row.otherServices, []),
      blockingDeadlineAt: toDate(
        row.blocking_deadline_at ?? row.blockingDeadlineAt,
      ),
      supplierPaymentDeadlineAt: toDate(
        row.supplier_payment_deadline_at ?? row.supplierPaymentDeadlineAt,
      ),
      cancellationDeadlineAt: toDate(
        row.cancellation_deadline_at ?? row.cancellationDeadlineAt,
      ),
      balanceDueBy: toDate(row.balance_due_by ?? row.balanceDueBy),
      deadlineRiskLevel:
        row.deadline_risk_level ?? row.deadlineRiskLevel ?? "SAFE",
      deadlineLastEvaluatedAt: toDate(
        row.deadline_last_evaluated_at ?? row.deadlineLastEvaluatedAt,
      ),
      cancellationReason:
        row.cancellation_reason ?? row.cancellationReason ?? null,
      cancelledAt: toDate(row.cancelled_at ?? row.cancelledAt),
      createdBy,
      createdByUser:
        createdByUser
          ? {
              id: createdByUser.id ?? createdBy,
              fullName: createdByUser.fullName ?? null,
              email: createdByUser.email ?? null,
            }
          : null,
      leadName: row.lead_name ?? row.leadName ?? null,
      leadEmail: row.lead_email ?? row.leadEmail ?? null,
      leadPhone: row.lead_phone ?? row.leadPhone ?? null,
      leadType: row.lead_type ?? row.leadType ?? null,
      destinationName: row.destination_name ?? row.destinationName ?? null,
      consultantId: row.consultant_id ?? row.consultantId ?? null,
      consultantName: row.consultant_name ?? row.consultantName ?? null,
      isApproved: toBoolean(row.is_approved ?? row.isApproved, false),
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toInvoice(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId,
      invoiceNumber: row.invoice_number ?? row.invoiceNumber ?? null,
      pdfUrl: row.pdf_url ?? row.pdfUrl ?? null,
      generatedAt: toDate(row.generated_at ?? row.generatedAt),
    };
  }

  function toPayment(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      amount: toNumber(row.amount, 0),
      currency: row.currency ?? "INR",
      paymentMode: row.payment_mode ?? row.paymentMode ?? null,
      paymentReference: row.payment_reference ?? row.paymentReference ?? null,
      proofUrl: row.proof_url ?? row.proofUrl ?? null,
      status: row.status ?? "PENDING",
      isVerified: toBoolean(row.is_verified ?? row.isVerified, false),
      paidAt: toDate(row.paid_at ?? row.paidAt),
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
    };
  }

  function toStatusHistory(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId,
      oldStatus: row.old_status ?? row.oldStatus ?? null,
      newStatus: row.new_status ?? row.newStatus ?? null,
      changedBy: row.changed_by ?? row.changedBy ?? null,
      changedAt: toDate(row.changed_at ?? row.changedAt),
    };
  }

  async function hasTable(tableName) {
    if (!canIntrospect()) {
      return true;
    }

    if (tableCache.has(tableName)) {
      return tableCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name=? LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableCache.set(tableName, false);
      return false;
    }
  }

  async function getTableColumns(tableName) {
    if (!canIntrospect()) {
      return null;
    }

    if (columnCache.has(tableName)) {
      return columnCache.get(tableName);
    }

    const exists = await hasTable(tableName);
    if (!exists) {
      const empty = new Set();
      columnCache.set(tableName, empty);
      return empty;
    }

    const result = await db.query(
      `SELECT COLUMN_NAME AS column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=?`,
      [tableName],
    );

    const columns = new Set(
      result.rows
        .map((row) => row.column_name ?? row.COLUMN_NAME ?? null)
        .filter(Boolean)
        .map((column) => String(column).toLowerCase()),
    );
    columnCache.set(tableName, columns);
    return columns;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return true;
    }

    return columns.has(String(columnName).toLowerCase());
  }

  async function buildStatsCurrencyExpression(
    _bookingAlias = "b",
    _quotationAlias = "q",
    leadAlias = "l",
  ) {
    let hasLeadClientCurrency = false;

    try {
      hasLeadClientCurrency = await hasColumn(
        schema.leadsTable,
        "client_currency",
      );
    } catch (error) {
      logger?.warn?.(
        {
          err: error,
          table: schema.tableName,
        },
        "Unable to inspect bookings currency columns for stats",
      );
    }

    const currencySources = [];
    if (hasLeadClientCurrency) {
      currencySources.push(`NULLIF(TRIM(${leadAlias}.client_currency), '')`);
    }
    currencySources.push("'AED'");

    return `UPPER(COALESCE(
      ${currencySources.join(",\n      ")}
    ))`;
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

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.paymentStatus) {
      mapped.payment_status = filters.paymentStatus;
    }
    if (filters.quotationId) {
      mapped.quotation_id = filters.quotationId;
    }
    if (filters.createdBy) {
      mapped.created_by = filters.createdBy;
    }
    if (filters.page) {
      mapped.page = filters.page;
    }
    if (filters.limit) {
      mapped.limit = filters.limit;
    }
    if (filters.search) {
      mapped.search = filters.search;
    }

    return mapped;
  }

  function buildStatsFilterSql(filters = {}, aliases = {}) {
    const bookingAlias = aliases.booking || "";
    const leadAlias = aliases.lead || "";
    const bookingPrefix = bookingAlias ? `${bookingAlias}.` : "";
    const leadPrefix = leadAlias ? `${leadAlias}.` : "";
    const conditions = [];
    const params = [];
    const normalizedStatus = String(filters.status || "").trim().toUpperCase();
    const paymentStatus = String(filters.paymentStatus || "").trim().toUpperCase();
    const payment = String(filters.payment || "").trim().toUpperCase();
    const risk = String(filters.risk || "").trim().toUpperCase();
    const search = String(filters.search || "").trim();
    const bookingId = String(filters.bookingId || "").trim();
    const customer = String(filters.customer || "").trim();
    const email = String(filters.email || "").trim();
    const phone = String(filters.phone || "").trim();
    const consultantId = String(filters.consultantId || "").trim();
    const consultant = String(filters.consultant || "").trim();
    const destinationId = String(filters.destinationId || "").trim();
    const destination = String(filters.destination || "").trim();
    const countryScope = String(
      filters.country || filters.market || filters.region || "",
    ).trim();
    const fromDate = String(filters.fromDate || "").trim();
    const toDate = String(filters.toDate || "").trim();

    if (filters.denyAll === true) {
      conditions.push("1 = 0");
    }
    if (filters.assignedTo && leadAlias) {
      conditions.push(`${leadPrefix}assigned_to = ?`);
      params.push(filters.assignedTo);
    }
    if (
      Array.isArray(filters.allowedCountries) &&
      filters.allowedCountries.length > 0 &&
      leadAlias
    ) {
      const allowedCountries = [
        ...new Set(
          filters.allowedCountries.flatMap((country) =>
            leadCountryAliases(country),
          ),
        ),
      ];
      conditions.push(
        `LOWER(TRIM(COALESCE(${leadPrefix}lead_country, ''))) IN (${allowedCountries
          .map(() => "?")
          .join(", ")})`,
      );
      params.push(...allowedCountries);
    }

    if (normalizedStatus && normalizedStatus !== "ALL") {
      conditions.push(`${bookingPrefix}status = ?`);
      params.push(normalizedStatus);
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      conditions.push(`${bookingPrefix}payment_status = ?`);
      params.push(paymentStatus);
    } else if (payment && payment !== "ALL") {
      if (payment === "PAID") {
        conditions.push(`${bookingPrefix}payment_status = 'FULL'`);
      } else if (payment === "PARTIAL") {
        conditions.push(`${bookingPrefix}payment_status = 'PARTIAL'`);
      } else if (payment === "UNPAID") {
        conditions.push(`${bookingPrefix}payment_status = 'PENDING'`);
      } else if (payment === "REFUNDED") {
        conditions.push(`${bookingPrefix}payment_status = 'REFUNDED'`);
      } else if (payment === "DUE") {
        conditions.push(
          `${bookingPrefix}status <> 'CANCELLED' AND COALESCE(${bookingPrefix}advance_received, 0) < COALESCE(${bookingPrefix}total_amount, 0)`,
        );
      }
    }

    if (risk === "OVERDUE") {
      conditions.push(
        `${bookingPrefix}supplier_payment_deadline_at IS NOT NULL AND ${bookingPrefix}supplier_payment_deadline_at < NOW()`,
      );
    } else if (risk === "D2_DUE") {
      conditions.push(
        `${bookingPrefix}supplier_payment_deadline_at > DATE_ADD(NOW(), INTERVAL 1 DAY)
         AND ${bookingPrefix}supplier_payment_deadline_at <= DATE_ADD(NOW(), INTERVAL 2 DAY)`,
      );
    } else if (risk === "DEADLINE_DUE") {
      conditions.push(
        `${bookingPrefix}supplier_payment_deadline_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)`,
      );
    } else if (risk === "SAFE") {
      conditions.push(`(
        ${bookingPrefix}supplier_payment_deadline_at IS NULL
        OR ${bookingPrefix}supplier_payment_deadline_at > DATE_ADD(NOW(), INTERVAL 2 DAY)
      )`);
    }

    if (bookingId) {
      conditions.push(`(${bookingPrefix}booking_number LIKE ? OR ${bookingPrefix}id LIKE ?)`);
      params.push(`%${bookingId}%`, `%${bookingId}%`);
    }
    if (customer && leadAlias) {
      conditions.push(`${leadPrefix}full_name LIKE ?`);
      params.push(`%${customer}%`);
    }
    if (email && leadAlias) {
      conditions.push(`${leadPrefix}email LIKE ?`);
      params.push(`%${email}%`);
    }
    if (phone && leadAlias) {
      conditions.push(`${leadPrefix}phone LIKE ?`);
      params.push(`%${phone}%`);
    }
    if (consultantId && leadAlias) {
      conditions.push(`${leadPrefix}assigned_to = ?`);
      params.push(consultantId);
    } else if (consultant && leadAlias) {
      conditions.push(`${leadPrefix}assigned_to IN (
        SELECT id FROM ${schema.usersTable} WHERE full_name LIKE ?
      )`);
      params.push(`%${consultant}%`);
    }
    if (destinationId && leadAlias) {
      conditions.push(`${leadPrefix}destination_id = ?`);
      params.push(destinationId);
    } else if (destination && leadAlias) {
      conditions.push(`(
        ${leadPrefix}destination_id IN (
          SELECT id FROM ${schema.destinationsTable} WHERE name = ?
        )
        OR ${leadPrefix}travel_to = ?
      )`);
      params.push(destination, destination);
    }
    if (countryScope && countryScope.toUpperCase() !== "ALL" && leadAlias) {
      const countryAliases = leadCountryAliases(countryScope);
      conditions.push(
        `LOWER(TRIM(COALESCE(${leadPrefix}lead_country, ''))) IN (${countryAliases
          .map(() => "?")
          .join(", ")})`,
      );
      params.push(...countryAliases);
    }
    if (fromDate) {
      conditions.push(`DATE(${bookingPrefix}created_at) >= ?`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`DATE(${bookingPrefix}created_at) <= ?`);
      params.push(toDate);
    }
    if (search) {
      const like = `%${search}%`;
      if (leadAlias) {
        conditions.push(`(
          ${bookingPrefix}booking_number LIKE ?
          OR ${bookingPrefix}id LIKE ?
          OR ${leadPrefix}full_name LIKE ?
          OR ${leadPrefix}email LIKE ?
          OR ${leadPrefix}phone LIKE ?
        )`);
        params.push(like, like, like, like, like);
      } else {
        conditions.push(`(${bookingPrefix}booking_number LIKE ? OR ${bookingPrefix}id LIKE ?)`);
        params.push(like, like);
      }
    }

    return { conditions, params };
  }

  function leadCountryAliases(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["india", "in", "ind"].includes(normalized)) {
      return ["india", "in", "ind"];
    }
    if (
      [
        "uae",
        "u.a.e",
        "ae",
        "dubai",
        "united arab emirates",
        "emirates",
      ].includes(normalized)
    ) {
      return [
        "uae",
        "u.a.e",
        "ae",
        "dubai",
        "united arab emirates",
        "emirates",
      ];
    }
    return [normalized];
  }

  async function loadUsersByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.usersTable, id)),
    );
    const userMap = new Map();

    rows.filter(Boolean).forEach((row) => {
      userMap.set(row.id, toUserDomain(row));
    });

    return userMap;
  }

  async function loadLeadIdsByQuotationIds(quotationIds = []) {
    const ids = [...new Set(quotationIds.filter(Boolean))];
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(
      ids.map((id) => db.findById(schema.quotationsTable, id)),
    );

    const leadIdMap = new Map();
    rows.filter(Boolean).forEach((row) => {
      const quotationId = row.id;
      const leadId = row.lead_id ?? row.leadId ?? null;
      leadIdMap.set(quotationId, leadId);
    });

    return leadIdMap;
  }

  async function loadLeadCurrenciesByIds(leadIds = []) {
    const ids = Array.from(
      new Set(
        leadIds
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    );
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.leadsTable, id)));
    const currencyMap = new Map();
    rows.filter(Boolean).forEach((row) => {
      const id = row.id;
      const currency = row.client_currency ?? row.clientCurrency ?? null;
      if (id && currency) {
        currencyMap.set(String(id), String(currency).toUpperCase());
      }
    });
    return currencyMap;
  }

  async function loadLeadCountriesByIds(leadIds = []) {
    const ids = Array.from(
      new Set(
        leadIds
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    );
    if (!ids.length) {
      return new Map();
    }

    const rows = await Promise.all(ids.map((id) => db.findById(schema.leadsTable, id)));
    const countryMap = new Map();
    rows.filter(Boolean).forEach((row) => {
      const id = row.id;
      const country = row.lead_country ?? row.leadCountry ?? row.country ?? null;
      if (id && country) {
        countryMap.set(String(id), String(country));
      }
    });
    return countryMap;
  }

  async function mapRowsToDomain(rows = []) {
    const [userMap, leadIdMap] = await Promise.all([
      loadUsersByIds(rows.map((row) => row.created_by ?? row.createdBy)),
      loadLeadIdsByQuotationIds(
        rows.map((row) => row.quotation_id ?? row.quotationId),
      ),
    ]);
    const leadIds = Array.from(leadIdMap.values());
    const [leadCurrencyMap, leadCountryMap] = await Promise.all([
      loadLeadCurrenciesByIds(leadIds),
      loadLeadCountriesByIds(leadIds),
    ]);
    return rows
      .map((row) => toBooking(row, userMap, leadIdMap, leadCurrencyMap, leadCountryMap))
      .filter(Boolean);
  }

  async function mapRowToDomain(row) {
    if (!row) {
      return null;
    }
    const [userMap, leadIdMap] = await Promise.all([
      loadUsersByIds([row.created_by ?? row.createdBy]),
      loadLeadIdsByQuotationIds([row.quotation_id ?? row.quotationId]),
    ]);
    const leadIds = Array.from(leadIdMap.values());
    const [leadCurrencyMap, leadCountryMap] = await Promise.all([
      loadLeadCurrenciesByIds(leadIds),
      loadLeadCountriesByIds(leadIds),
    ]);
    const booking = toBooking(
      row,
      userMap,
      leadIdMap,
      leadCurrencyMap,
      leadCountryMap,
    );
    if (!booking?.leadId) {
      return booking;
    }

    const lead = await db.findById(schema.leadsTable, booking.leadId);
    if (!lead) {
      return booking;
    }

    const consultantId = lead.assigned_to ?? lead.assignedTo ?? null;
    const destinationId = lead.destination_id ?? lead.destinationId ?? null;
    const [consultant, destination] = await Promise.all([
      consultantId ? db.findById(schema.usersTable, consultantId) : null,
      destinationId ? db.findById(schema.destinationsTable, destinationId) : null,
    ]);

    return {
      ...booking,
      leadName: lead.full_name ?? lead.fullName ?? booking.leadName ?? null,
      leadEmail: lead.email ?? booking.leadEmail ?? null,
      leadPhone: lead.phone ?? lead.mobile ?? booking.leadPhone ?? null,
      leadType: lead.lead_type ?? lead.leadType ?? booking.leadType ?? null,
      destinationName:
        destination?.name ??
        lead.travel_to ??
        lead.travelTo ??
        booking.destinationName ??
        null,
      consultantId,
      consultantName:
        consultant?.full_name ??
        consultant?.fullName ??
        booking.consultantName ??
        null,
    };
  }

  function normalizeReminderType(value) {
    if (!value) return null;
    return String(value).trim().toUpperCase();
  }

  function normalizeAlertType(value) {
    if (!value) return null;
    return String(value).trim().toUpperCase();
  }

  async function findTravelReminderCandidates({
    reminderType,
    scheduledFor,
    limit,
  } = {}) {
    const normalizedType = normalizeReminderType(reminderType);
    if (!normalizedType || !scheduledFor) {
      return [];
    }

    const dateColumn =
      normalizedType === "PRE_TRAVEL" ? "travel_start_date" : "travel_end_date";

    if (typeof db.query !== "function") {
      const rows = await db.findMany(schema.tableName, {});
      const list = rows.map((row) => toBooking(row)).filter(Boolean);
      const filtered = list.filter((item) => {
        if (item.isDeleted) return false;
        if (item.status !== "CONFIRMED") return false;
        const dateValue =
          normalizedType === "PRE_TRAVEL"
            ? item.travelStartDate
            : item.travelEndDate;
        return dateValue === scheduledFor;
      });
      return limit ? filtered.slice(0, limit) : filtered;
    }

    // Placeholder order must match SQL: JOIN (reminder_type, scheduled_for) then WHERE (dateColumn).
    const params = [];
    let joinClause = "";
    const conditions = [
      "TRUE",
      "b.status = 'CONFIRMED'",
      `b.${dateColumn} = ?`,
    ];

    const hasLogsTable = await hasTable(schema.reminderLogsTable);
    if (hasLogsTable) {
      const columns = await getTableColumns(schema.reminderLogsTable);
      const hasReminderTypeColumn = !columns || columns.has("reminder_type");
      const hasScheduledForColumn = !columns || columns.has("scheduled_for");

      let join = `LEFT JOIN ${schema.reminderLogsTable} r ON r.booking_id = b.id`;
      if (hasReminderTypeColumn) {
        params.push(normalizedType);
        join += ` AND r.reminder_type = ?`;
      }
      if (hasScheduledForColumn) {
        params.push(scheduledFor);
        join += ` AND r.scheduled_for = ?`;
      }
      joinClause = join;
      conditions.push("r.id IS NULL");
    }

    params.push(scheduledFor);

    let sql = `SELECT b.* FROM ${schema.tableName} b`;
    if (joinClause) {
      sql += ` ${joinClause}`;
    }
    if (conditions.length) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    if (limit) {
      params.push(limit);
      sql += ` LIMIT ?`;
    }

    const result = await db.query(sql, params);
    return result.rows.map((row) => toBooking(row)).filter(Boolean);
  }

  async function createReminderLog(payload = {}) {
    const tableExists = await hasTable(schema.reminderLogsTable);
    if (!tableExists) {
      return null;
    }

    const record = {
      booking_id: payload.bookingId,
      reminder_type: normalizeReminderType(payload.reminderType),
      scheduled_for: payload.scheduledFor,
      sent_at: payload.sentAt || new Date().toISOString(),
    };
    const sanitized = await sanitizeForTable(schema.reminderLogsTable, record);
    if (!Object.keys(sanitized).length) {
      return null;
    }
    return db.insert(schema.reminderLogsTable, sanitized);
  }

  async function findDeadlineCandidates({ limit } = {}) {
    if (typeof db.query === "function") {
      const params = [];
      const conditions = [
        "TRUE",
        "b.status <> 'CANCELLED'",
        "(b.supplier_payment_deadline_at IS NOT NULL OR b.cancellation_deadline_at IS NOT NULL)",
      ];

      let sql = `SELECT b.* FROM ${schema.tableName} b WHERE ${conditions.join(" AND ")} ORDER BY COALESCE(b.supplier_payment_deadline_at, b.cancellation_deadline_at) ASC`;
      if (limit) {
        params.push(limit);
        sql += ` LIMIT ?`;
      }

      const result = await db.query(sql, params);
      return mapRowsToDomain(result.rows || []);
    }

    const rows = await db.findMany(schema.tableName, {});
    const list = await mapRowsToDomain(rows);
    const filtered = list
      .filter((item) => !item.isDeleted)
      .filter((item) => item.status !== "CANCELLED")
      .filter(
        (item) =>
          Boolean(item.supplierPaymentDeadlineAt) ||
          Boolean(item.cancellationDeadlineAt),
      )
      .sort((left, right) => {
        const leftTime = new Date(
          left.supplierPaymentDeadlineAt || left.cancellationDeadlineAt || 0,
        ).getTime();
        const rightTime = new Date(
          right.supplierPaymentDeadlineAt || right.cancellationDeadlineAt || 0,
        ).getTime();
        return leftTime - rightTime;
      });

    return limit ? filtered.slice(0, limit) : filtered;
  }

  async function findDeadlineAlertLog({
    bookingId,
    alertType,
    alertDate,
  } = {}) {
    const tableExists = await hasTable(schema.deadlineAlertLogsTable);
    if (!tableExists) {
      return null;
    }
    const normalizedType = normalizeAlertType(alertType);
    if (!bookingId || !normalizedType || !alertDate) {
      return null;
    }

    return db.findOne(schema.deadlineAlertLogsTable, {
      booking_id: bookingId,
      alert_type: normalizedType,
      alert_date: alertDate,
    });
  }

  async function createDeadlineAlertLog(payload = {}) {
    const tableExists = await hasTable(schema.deadlineAlertLogsTable);
    if (!tableExists) {
      return null;
    }

    const record = {
      booking_id: payload.bookingId,
      alert_type: normalizeAlertType(payload.alertType),
      alert_date: payload.alertDate,
      triggered_at: payload.triggeredAt || new Date().toISOString(),
      metadata: payload.metadata || {},
    };

    const sanitized = await sanitizeForTable(
      schema.deadlineAlertLogsTable,
      serializeJsonColumns(record, DEADLINE_ALERT_LOG_JSON_COLUMNS),
    );
    if (!Object.keys(sanitized).length) {
      return null;
    }

    return db.insert(schema.deadlineAlertLogsTable, sanitized);
  }

  async function getVerifiedPayments(bookingId) {
    const rows = await db.findMany(schema.paymentsTable, {
      booking_id: bookingId,
    });

    return rows.filter((row) => {
      const isVerified = toBoolean(row.is_verified ?? row.isVerified, false);
      const status = row.status ?? "PENDING";
      return isVerified && status !== "REFUNDED";
    });
  }

  async function getProcessedRefundRows(bookingId) {
    const tableExists = await hasTable(schema.refundsTable);
    if (!tableExists) {
      return [];
    }

    const rows = await db.findMany(schema.refundsTable, {
      booking_id: bookingId,
    });
    return rows.filter((row) => (row.status ?? "INITIATED") === "PROCESSED");
  }

  return Object.freeze({
    async getStats(filters = {}) {
      const tableExists = await hasTable(schema.tableName);
      if (!tableExists) {
        return {
          totalBookings: 0,
          activeBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          pendingPaymentsAmount: 0,
          pendingPaymentsCount: 0,
        };
      }

      if (canIntrospect()) {
        let hasSoftDelete = false;
        try {
          hasSoftDelete = await hasColumn(schema.tableName, "is_deleted");
        } catch (error) {
          logger?.warn?.(
            { err: error, table: schema.tableName },
            "Unable to inspect bookings table columns for stats",
          );
        }

        const statsFilters = buildStatsFilterSql(filters, {
          booking: "b",
          lead: "l",
        });
        const buildWhere = (notDeletedPredicate) =>
          [notDeletedPredicate, ...statsFilters.conditions].join(" AND ");

        const buildStatsQuery = (wherePredicate) => `
            SELECT
              COUNT(*) AS total_bookings,
              SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS active_bookings,
              SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_bookings,
              SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_bookings,
              SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.total_amount, 0) ELSE 0 END), 0) AS total_revenue,
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0), 0) ELSE 0 END), 0) AS pending_payments_amount,
              SUM(CASE WHEN b.status <> 'CANCELLED' AND COALESCE(b.advance_received, 0) < COALESCE(b.total_amount, 0) THEN 1 ELSE 0 END) AS pending_payments_count
            FROM ${schema.tableName} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            WHERE ${wherePredicate}
          `;

        const predicateWithSoftDelete = hasSoftDelete
          ? "COALESCE(b.is_deleted, FALSE) = FALSE"
          : "TRUE";

        let result;
        try {
          result = await db.query(
            buildStatsQuery(buildWhere(predicateWithSoftDelete)),
            statsFilters.params,
          );
        } catch (error) {
          const message = String(error?.message || "");
          const code = error?.code;
          const missingColumn =
            code === "42703" || message.includes("is_deleted");
          if (missingColumn && predicateWithSoftDelete !== "TRUE") {
            result = await db.query(
              buildStatsQuery(buildWhere("TRUE")),
              statsFilters.params,
            );
          } else {
            throw error;
          }
        }

        const row = result.rows[0] || {};
        return {
          totalBookings: toNumber(row.total_bookings, 0),
          activeBookings: toNumber(row.active_bookings, 0),
          pendingBookings: toNumber(row.pending_bookings, 0),
          completedBookings: toNumber(row.completed_bookings, 0),
          cancelledBookings: toNumber(row.cancelled_bookings, 0),
          totalRevenue: toNumber(row.total_revenue, 0),
          pendingPaymentsAmount: toNumber(row.pending_payments_amount, 0),
          pendingPaymentsCount: toNumber(row.pending_payments_count, 0),
        };
      }

      const rows = await db.findMany(schema.tableName, {});
      const list = rows.map((row) => toBooking(row)).filter(Boolean);
      const active = list.filter((item) => item.status === "CONFIRMED");
      const pending = list.filter((item) => item.status === "PENDING");
      const completed = list.filter((item) => item.status === "COMPLETED");
      const cancelled = list.filter((item) => item.status === "CANCELLED");
      const nonCancelled = list.filter((item) => item.status !== "CANCELLED");
      const pendingPayments = nonCancelled.filter(
        (item) => item.advanceReceived < item.totalAmount,
      );

      return {
        totalBookings: list.length,
        activeBookings: active.length,
        pendingBookings: pending.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        totalRevenue: nonCancelled.reduce(
          (sum, item) => sum + toNumber(item.totalAmount, 0),
          0,
        ),
        pendingPaymentsAmount: pendingPayments.reduce(
          (sum, item) =>
            sum +
            Math.max(
              toNumber(item.totalAmount, 0) -
                toNumber(item.advanceReceived, 0),
              0,
            ),
          0,
        ),
        pendingPaymentsCount: pendingPayments.length,
      };
    },

    async getStatsMoneyByCurrency(filters = {}) {
      const tableExists = await hasTable(schema.tableName);
      if (!tableExists) {
        return [];
      }

      if (canIntrospect()) {
        let hasSoftDelete = false;
        try {
          hasSoftDelete = await hasColumn(schema.tableName, "is_deleted");
        } catch (error) {
          logger?.warn?.(
            { err: error, table: schema.tableName },
            "Unable to inspect bookings table columns for stats money",
          );
        }

        const currencyExpression = await buildStatsCurrencyExpression(
          "b",
          "q",
          "l",
        );
        const statsFilters = buildStatsFilterSql(filters, {
          booking: "b",
          lead: "l",
        });
        const buildWhere = (notDeletedPredicate) =>
          [notDeletedPredicate, ...statsFilters.conditions].join(" AND ");
        const buildMoneyQuery = (wherePredicate) => `
            SELECT
              ${currencyExpression} AS currency,
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN COALESCE(b.total_amount, 0) ELSE 0 END), 0) AS total_revenue_amount,
              COALESCE(SUM(CASE WHEN b.status <> 'CANCELLED' THEN GREATEST(COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0), 0) ELSE 0 END), 0) AS pending_payments_amount
            FROM ${schema.tableName} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            WHERE ${wherePredicate}
            GROUP BY currency
          `;

        const predicateWithSoftDelete = hasSoftDelete
          ? "COALESCE(b.is_deleted, FALSE) = FALSE"
          : "TRUE";

        let result;
        try {
          result = await db.query(
            buildMoneyQuery(buildWhere(predicateWithSoftDelete)),
            statsFilters.params,
          );
        } catch (error) {
          const message = String(error?.message || "");
          const code = error?.code;
          const missingColumn =
            code === "42703" ||
            code === "ER_BAD_FIELD_ERROR" ||
            error?.errno === 1054 ||
            message.includes("Unknown column") ||
            message.includes("is_deleted");
          if (missingColumn && predicateWithSoftDelete !== "TRUE") {
            result = await db.query(
              buildMoneyQuery(buildWhere("TRUE")),
              statsFilters.params,
            );
          } else {
            throw error;
          }
        }

        return (result?.rows || []).map((row) => ({
          currency: String(row.currency || "AED").trim().toUpperCase() || "AED",
          totalRevenueAmount: toNumber(row.total_revenue_amount, 0),
          pendingPaymentsAmount: toNumber(row.pending_payments_amount, 0),
        }));
      }

      const [bookingRows, quotationRows, leadRows] = await Promise.all([
        db.findMany(schema.tableName, {}),
        db.findMany(schema.quotationsTable, {}),
        db.findMany(schema.leadsTable, {}),
      ]);

      const quotationMap = new Map(
        quotationRows.map((row) => [row.id, row]),
      );
      const leadMap = new Map(leadRows.map((row) => [row.id, row]));
      const moneyByCurrency = new Map();

      bookingRows
        .filter((row) => !toBoolean(row.is_deleted ?? row.isDeleted, false))
        .filter(
          (row) => String(row.status ?? "").trim().toUpperCase() !== "CANCELLED",
        )
        .forEach((row) => {
          const quotation =
            quotationMap.get(row.quotation_id ?? row.quotationId) || null;
          const lead =
            leadMap.get(quotation?.lead_id ?? quotation?.leadId) || null;
          const currency =
            String(
              lead?.client_currency ??
                lead?.clientCurrency ??
                "AED",
            )
              .trim()
              .toUpperCase() || "AED";
          const current = moneyByCurrency.get(currency) || {
            currency,
            totalRevenueAmount: 0,
            pendingPaymentsAmount: 0,
          };
          const totalAmount = toNumber(row.total_amount ?? row.totalAmount, 0);
          const advanceReceived = toNumber(
            row.advance_received ?? row.advanceReceived,
            0,
          );

          current.totalRevenueAmount += totalAmount;
          current.pendingPaymentsAmount += Math.max(
            totalAmount - advanceReceived,
            0,
          );
          moneyByCurrency.set(currency, current);
        });

      return Array.from(moneyByCurrency.values()).map((row) => ({
        currency: row.currency,
        totalRevenueAmount: toNumber(row.totalRevenueAmount, 0),
        pendingPaymentsAmount: toNumber(row.pendingPaymentsAmount, 0),
      }));
    },

    async findAll(filters = {}) {
      if (canIntrospect()) {
        const statsFilters = buildStatsFilterSql(filters, {
          booking: "b",
          lead: "l",
        });
        const conditions = [...statsFilters.conditions];
        if (!filters.includeDeleted && (await hasColumn(schema.tableName, "is_deleted"))) {
          conditions.unshift("COALESCE(b.is_deleted, FALSE) = FALSE");
        }

        const page = Math.max(Number.parseInt(String(filters.page || "1"), 10) || 1, 1);
        const limit = Math.min(
          Math.max(Number.parseInt(String(filters.limit || "100"), 10) || 100, 1),
          500,
        );
        const offset = (page - 1) * limit;
        const sortBy = String(filters.sortBy || "NEWEST_FIRST").toUpperCase();
        const orderBy =
          sortBy === "OLDEST_FIRST" ? "b.created_at ASC"
          : sortBy === "AMOUNT_HIGH_TO_LOW" ? "b.total_amount DESC"
          : sortBy === "AMOUNT_LOW_TO_HIGH" ? "b.total_amount ASC"
          : sortBy === "CUSTOMER_A_Z" ? "l.full_name ASC, b.created_at DESC"
          : "b.created_at DESC";

        const whereSql = conditions.length ? conditions.join(" AND ") : "TRUE";
        const [countResult, result] = await Promise.all([
          db.query(
            `
              SELECT COUNT(*) AS total
              FROM ${schema.tableName} b
              LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
              LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
              WHERE ${whereSql}
            `,
            statsFilters.params,
          ),
          db.query(
            `
              SELECT
                b.*,
                q.lead_id AS joined_lead_id,
                l.full_name AS lead_name,
                l.email AS lead_email,
                l.phone AS lead_phone,
                l.lead_type AS lead_type,
                l.client_currency AS joined_client_currency,
                l.lead_country AS joined_lead_country,
                l.assigned_to AS consultant_id,
                u.full_name AS consultant_name,
                d.name AS destination_name
              FROM ${schema.tableName} b
              LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
              LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
              LEFT JOIN ${schema.usersTable} u ON u.id = l.assigned_to
              LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
              WHERE ${whereSql}
              ORDER BY ${orderBy}
              LIMIT ? OFFSET ?
            `,
            [...statsFilters.params, limit, offset],
          ),
        ]);
        const total = toNumber(countResult.rows?.[0]?.total, 0);
        return {
          data: (result.rows || []).map((row) => toBooking(row)).filter(Boolean),
          meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        };
      }

      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      let list = await mapRowsToDomain(rows);

      if (!filters.includeDeleted) {
        list = list.filter((item) => !item.isDeleted);
      }

      if (filters.search) {
        const searchTerm = String(filters.search).toLowerCase().trim();
        list = list.filter((item) => {
          const bookingNumber = String(item.bookingNumber || '').toLowerCase();
          const bookingId = String(item.id || '').toLowerCase();
          return bookingNumber.includes(searchTerm) || bookingId.includes(searchTerm);
        });
      }

      const sorted = list.sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });
      const page = Math.max(Number.parseInt(String(filters.page || "1"), 10) || 1, 1);
      const limit = Math.max(Number.parseInt(String(filters.limit || "100"), 10) || 100, 1);
      const total = sorted.length;
      return {
        data: sorted.slice((page - 1) * limit, page * limit),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return mapRowToDomain(row);
    },

    async findByQuotationId(quotationId) {
      const row = await db.findOne(schema.tableName, {
        quotation_id: quotationId,
      });
      return mapRowToDomain(row);
    },

    async findByBookingNumber(bookingNumber) {
      const row = await db.findOne(schema.tableName, {
        booking_number: bookingNumber,
      });
      return mapRowToDomain(row);
    },

    findTravelReminderCandidates,
    createReminderLog,
    findDeadlineCandidates,
    findDeadlineAlertLog,
    createDeadlineAlertLog,

    async findQuotationById(id) {
      if (!id) {
        return null;
      }

      const row = await db.findById(schema.quotationsTable, id);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        status: row.status,
        leadId: row.lead_id ?? row.leadId ?? null,
        isDeleted: row.is_deleted ?? row.isDeleted ?? false,
      };
    },

    async findUserById(id) {
      if (!id) {
        return null;
      }
      return db.findById(schema.usersTable, id);
    },

    async create(payload) {
      logger.debug({ module: "bookings", payload }, "Creating booking");
      const sanitized = await sanitizeForTable(
        schema.tableName,
        serializeJsonColumns(payload, BOOKING_JSON_COLUMNS),
      );
      const row = await db.insert(schema.tableName, sanitized);
      return mapRowToDomain(row);
    },

    async update(id, payload) {
      logger.debug({ module: "bookings", id, payload }, "Updating booking");
      const sanitized = await sanitizeForTable(
        schema.tableName,
        serializeJsonColumns(payload, BOOKING_JSON_COLUMNS),
      );
      const row = await db.update(schema.tableName, id, sanitized);
      return mapRowToDomain(row);
    },

    async createStatusHistory(payload) {
      const tableExists = await hasTable(schema.statusHistoryTable);
      if (!tableExists) {
        return null;
      }

      const row = await db.insert(schema.statusHistoryTable, {
        booking_id: payload.bookingId,
        old_status: payload.oldStatus || null,
        new_status: payload.newStatus,
        changed_by: payload.changedBy || null,
        changed_at: payload.changedAt || new Date().toISOString(),
      });

      return toStatusHistory(row);
    },

    async listStatusHistory(bookingId) {
      const tableExists = await hasTable(schema.statusHistoryTable);
      if (!tableExists) {
        return [];
      }

      const rows = await db.findMany(schema.statusHistoryTable, {
        booking_id: bookingId,
      });
      return rows
        .map((row) => toStatusHistory(row))
        .sort((a, b) => {
          const left = new Date(a.changedAt || 0).getTime();
          const right = new Date(b.changedAt || 0).getTime();
          return right - left;
        });
    },

    async createInvoice(payload) {
      const row = await db.insert(schema.invoicesTable, {
        booking_id: payload.bookingId,
        invoice_number: payload.invoiceNumber,
        pdf_url: payload.pdfUrl || null,
        generated_at: payload.generatedAt || new Date().toISOString(),
      });

      return toInvoice(row);
    },

    async findInvoicesByBookingId(bookingId) {
      const rows = await db.findMany(schema.invoicesTable, {
        booking_id: bookingId,
      });
      return rows
        .map((row) => toInvoice(row))
        .sort((a, b) => {
          const left = new Date(a.generatedAt || 0).getTime();
          const right = new Date(b.generatedAt || 0).getTime();
          return right - left;
        });
    },

    async findInvoiceByNumber(invoiceNumber) {
      const row = await db.findOne(schema.invoicesTable, {
        invoice_number: invoiceNumber,
      });
      return toInvoice(row);
    },

    async findPaymentByBookingAndReference(bookingId, paymentReference) {
      const tableExists = await hasTable(schema.paymentsTable);
      if (!tableExists || !bookingId || !paymentReference) {
        return null;
      }

      const row = await db.findOne(schema.paymentsTable, {
        booking_id: bookingId,
        payment_reference: paymentReference,
      });
      return toPayment(row);
    },

    async createPendingInvoicePayment(payload) {
      const tableExists = await hasTable(schema.paymentsTable);
      if (!tableExists) {
        return null;
      }

      const amount = toNumber(payload.amount, 0);
      if (amount <= 0) {
        return null;
      }

      const existing = await db.findOne(schema.paymentsTable, {
        booking_id: payload.bookingId,
        payment_reference: payload.paymentReference,
      });
      if (existing) {
        return toPayment(existing);
      }

      const nowIso = new Date().toISOString();
      const row = await db.insert(schema.paymentsTable, {
        booking_id: payload.bookingId,
        amount,
        currency: payload.currency || "INR",
        payment_mode: payload.paymentMode || "BANK_TRANSFER",
        payment_reference: payload.paymentReference || null,
        proof_url: payload.proofUrl || null,
        status: "PENDING",
        is_verified: false,
        paid_at: null,
        updated_at: nowIso,
      });

      return toPayment(row);
    },

    async getPaymentPolicySnapshot(bookingId, advanceRequired = 0) {
      if (canIntrospect()) {
        const paidResult = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.paymentsTable}
            WHERE booking_id = ?
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        const proofResult = await db.query(
          `
            SELECT COUNT(*) AS proof_count
            FROM ${schema.paymentsTable}
            WHERE booking_id = ?
              AND COALESCE(is_verified, FALSE) = TRUE
              AND (
                proof_url IS NOT NULL
                OR gateway_payment_id IS NOT NULL
                OR payment_reference IS NOT NULL
              )
          `,
          [bookingId],
        );

        const paidAmount = toNumber(paidResult.rows[0]?.paid_amount, 0);
        const proofCount = toNumber(proofResult.rows[0]?.proof_count, 0);

        return {
          paidAmount,
          hasProof: proofCount > 0,
          meetsAdvance: paidAmount >= toNumber(advanceRequired, 0),
        };
      }

      const verifiedPayments = await getVerifiedPayments(bookingId);
      const paidAmount = verifiedPayments.reduce(
        (sum, row) => sum + toNumber(row.amount, 0),
        0,
      );
      const hasProof = verifiedPayments.some((row) => {
        return Boolean(
          row.proof_url ||
          row.proofUrl ||
          row.gateway_payment_id ||
          row.payment_reference,
        );
      });

      return {
        paidAmount,
        hasProof,
        meetsAdvance: paidAmount >= toNumber(advanceRequired, 0),
      };
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canIntrospect()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
            FROM ${schema.paymentsTable}
            WHERE booking_id = ?
              AND COALESCE(is_verified, FALSE) = TRUE
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const verifiedPayments = await getVerifiedPayments(bookingId);
      return verifiedPayments.reduce(
        (sum, payment) => sum + toNumber(payment.amount, 0),
        0,
      );
    },

    async getProcessedRefundAmount(bookingId) {
      if (canIntrospect()) {
        const tableExists = await hasTable(schema.refundsTable);
        if (!tableExists) {
          return 0;
        }

        const result = await db.query(
          `
            SELECT COALESCE(SUM(refund_amount), 0) AS refund_amount
            FROM ${schema.refundsTable}
            WHERE booking_id = ?
              AND status = 'PROCESSED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.refund_amount, 0);
      }

      const rows = await getProcessedRefundRows(bookingId);
      return rows.reduce(
        (sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
        0,
      );
    },

    async hasColumn(tableName, columnName) {
      return hasColumn(tableName, columnName);
    },

    async findPaymentPickerOptions(filters = {}) {
      const limit = Math.min(
        Math.max(Number.parseInt(String(filters.limit ?? "50"), 10) || 50, 1),
        100,
      );
      const search = String(filters.search ?? "").trim();

      if (canIntrospect()) {
        const conditions = ["b.status <> 'CANCELLED'"];
        const params = [];
        const visibilityFilters = buildStatsFilterSql(
          {
            denyAll: filters.denyAll,
            assignedTo: filters.assignedTo,
            allowedCountries: filters.allowedCountries,
          },
          { booking: "b", lead: "l" },
        );
        conditions.push(...visibilityFilters.conditions);
        params.push(...visibilityFilters.params);

        if (search.length >= 2) {
          const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
          conditions.push(
            "(b.booking_number LIKE ? OR CAST(b.id AS CHAR) LIKE ?)",
          );
          params.push(like, like);
        }

        const currencyExpression =
          "COALESCE(NULLIF(l.client_currency, ''), 'AED')";

        const runPickerQuery = (currencyExpr) =>
          db.query(
            `
            SELECT
              b.id,
              b.booking_number,
              b.total_amount,
              ${currencyExpr} AS currency,
              l.full_name AS customer_name
            FROM ${schema.tableName} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            WHERE ${conditions.join(" AND ")}
            ORDER BY b.created_at DESC
            LIMIT ?
          `,
            [...params, limit],
          );

        let result;
        try {
          result = await runPickerQuery(currencyExpression);
        } catch (error) {
          const message = String(error?.message || "");
          const missingColumn =
            error?.code === "42703" ||
            error?.code === "ER_BAD_FIELD_ERROR" ||
            error?.errno === 1054 ||
            message.includes("Unknown column") ||
            message.includes("client_currency") ||
            message.includes("currency");

          if (!missingColumn) {
            throw error;
          }

          result = await runPickerQuery("'AED'");
        }

        return (result.rows || []).map((row) => ({
          id: row.id,
          bookingNumber: row.booking_number ?? row.bookingNumber ?? row.id,
          customer:
            typeof row.customer_name === "string" ?
              row.customer_name.trim()
            : "",
          currency: String(row.currency || "AED").toUpperCase(),
          totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
        }));
      }

      const rows = await db.findMany(schema.tableName, {});
      const bookings = await mapRowsToDomain(rows);
      const searchTerm = search.toLowerCase();
      return bookings
        .filter((booking) => booking.status !== "CANCELLED")
        .filter((booking) => !booking.isDeleted)
        .filter((booking) => {
          if (search.length < 2) return true;
          const bookingNumber = String(
            booking.bookingNumber ?? "",
          ).toLowerCase();
          const bookingId = String(booking.id ?? "").toLowerCase();
          return (
            bookingNumber.includes(searchTerm) || bookingId.includes(searchTerm)
          );
        })
        .slice(0, limit)
        .map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber ?? booking.id,
          customer: booking.leadName ?? "",
          currency: String(booking.clientCurrency || "AED").toUpperCase(),
          totalAmount: toNumber(booking.totalAmount, 0),
        }));
    },
  });
}

export { createBookingsRepository };
