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
    return typeof db.query === "function" && db.adapter === "mysql";
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

  function toBooking(row, userMap = new Map(), leadIdMap = new Map()) {
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
      clientCurrency: row.client_currency ?? row.clientCurrency ?? null,
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
        `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
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
      `SELECT COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName],
    );

    const columns = new Set(
      (result.rows || []).map(
        (row) => row.column_name ?? row.COLUMN_NAME,
      ),
    );
    columnCache.set(tableName, columns);
    return columns;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    if (columns === null) {
      return true;
    }

    return columns.has(columnName);
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

    return mapped;
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

  async function mapRowsToDomain(rows = []) {
    const [userMap, leadIdMap] = await Promise.all([
      loadUsersByIds(rows.map((row) => row.created_by ?? row.createdBy)),
      loadLeadIdsByQuotationIds(
        rows.map((row) => row.quotation_id ?? row.quotationId),
      ),
    ]);
    return rows
      .map((row) => toBooking(row, userMap, leadIdMap))
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
    return toBooking(row, userMap, leadIdMap);
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

    const params = [scheduledFor];
    let joinClause = "";
    const bookingHasSoftDelete = await hasColumn(schema.tableName, "is_deleted");
    const conditions = [
      ...(bookingHasSoftDelete ? ["b.is_deleted = 0"] : []),
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
      const bookingHasSoftDelete = await hasColumn(schema.tableName, "is_deleted");
      const conditions = [
        ...(bookingHasSoftDelete ? ["COALESCE(b.is_deleted, 0) = 0"] : []),
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
    async getStats() {
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

        const buildStatsQuery = (notDeletedPredicate) => `
            SELECT
              SUM(CASE WHEN ${notDeletedPredicate} THEN 1 ELSE 0 END) AS total_bookings,
              SUM(CASE WHEN status = 'CONFIRMED' AND ${notDeletedPredicate} THEN 1 ELSE 0 END) AS active_bookings,
              SUM(CASE WHEN status = 'PENDING' AND ${notDeletedPredicate} THEN 1 ELSE 0 END) AS pending_bookings,
              SUM(CASE WHEN status = 'COMPLETED' AND ${notDeletedPredicate} THEN 1 ELSE 0 END) AS completed_bookings,
              SUM(CASE WHEN status = 'CANCELLED' AND ${notDeletedPredicate} THEN 1 ELSE 0 END) AS cancelled_bookings,
              COALESCE(SUM(CASE WHEN status <> 'CANCELLED' AND ${notDeletedPredicate} THEN COALESCE(total_amount, 0) ELSE 0 END), 0) AS total_revenue,
              COALESCE(SUM(CASE WHEN status <> 'CANCELLED' AND ${notDeletedPredicate} THEN GREATEST(COALESCE(total_amount, 0) - COALESCE(advance_received, 0), 0) ELSE 0 END), 0) AS pending_payments_amount,
              SUM(CASE WHEN status <> 'CANCELLED' AND ${notDeletedPredicate} AND COALESCE(advance_received, 0) < COALESCE(total_amount, 0) THEN 1 ELSE 0 END) AS pending_payments_count
            FROM ${schema.tableName}
          `;

        const predicateWithSoftDelete = hasSoftDelete
          ? "COALESCE(is_deleted, 0) = 0"
          : "1 = 1";

        let result;
        try {
          result = await db.query(buildStatsQuery(predicateWithSoftDelete));
        } catch (error) {
          const message = String(error?.message || "");
          const code = error?.code;
          const missingColumn =
            code === "42703" ||
            code === "ER_BAD_FIELD_ERROR" ||
            message.includes("is_deleted");
          if (missingColumn && predicateWithSoftDelete !== "1 = 1") {
            result = await db.query(buildStatsQuery("1 = 1"));
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
    async findAll(filters = {}) {
      const rows = await db.findMany(schema.tableName, mapListFilters(filters));
      let list = await mapRowsToDomain(rows);

      if (!filters.includeDeleted) {
        list = list.filter((item) => !item.isDeleted);
      }

      return list.sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });
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
              AND COALESCE(is_verified, 0) = 1
              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        const proofResult = await db.query(
          `
            SELECT COUNT(*) AS proof_count
            FROM ${schema.paymentsTable}
            WHERE booking_id = ?
              AND COALESCE(is_verified, 0) = 1
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
              AND COALESCE(is_verified, 0) = 1
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
  });
}

export { createBookingsRepository };
