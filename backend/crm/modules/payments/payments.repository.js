function createPaymentsRepository({ db, logger, schema }) {
  const tableCache = new Map();
  const columnCache = new Map();

  function canUseRawQuery() {
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

  function toPayment(row) {
    if (!row) {
      return null;
    }

    const leadId = row.lead_id ?? row.leadId ?? null;
    const leadFullName = row.lead_full_name ?? row.leadFullName ?? null;
    const leadEmail = row.lead_email ?? row.leadEmail ?? null;
    const leadPhone = row.lead_phone ?? row.leadPhone ?? row.lead_mobile ?? row.leadMobile ?? null;
    const leadCountry = row.lead_country ?? row.leadCountry ?? null;

    return {
      id: row.id,
      bookingId: row.booking_id ?? row.bookingId ?? null,
      bookingNumber: row.booking_number ?? row.bookingNumber ?? null,
      amount: toNumber(row.amount, 0),
      currency: row.derived_currency ?? row.derivedCurrency ?? row.currency ?? "AED",
      paymentMode: row.payment_mode ?? row.paymentMode ?? null,
      gatewayProvider: row.gateway_provider ?? row.gatewayProvider ?? null,
      gatewayOrderId: row.gateway_order_id ?? row.gatewayOrderId ?? null,
      gatewayPaymentId: row.gateway_payment_id ?? row.gatewayPaymentId ?? null,
      gatewaySignature: row.gateway_signature ?? row.gatewaySignature ?? null,
      paymentReference: row.payment_reference ?? row.paymentReference ?? null,
      proofUrl: row.proof_url ?? row.proofUrl ?? null,
      invoiceUrl: row.invoice_url ?? row.invoiceUrl ?? null,
      status: row.status ?? "PENDING",
      isVerified: toBoolean(row.is_verified ?? row.isVerified, false),
      verifiedBy: row.verified_by ?? row.verifiedBy ?? null,
      verifiedByName: row.verified_by_name ?? row.verifiedByName ?? null,
      verifiedAt: toDate(row.verified_at ?? row.verifiedAt),
      paidAt: toDate(row.paid_at ?? row.paidAt),
      notes: row.notes ?? row.note ?? null,
      createdAt: toDate(row.created_at ?? row.createdAt),
      updatedAt: toDate(row.updated_at ?? row.updatedAt),
      leadId,
      customerName: leadFullName,
      customerEmail: leadEmail,
      customerPhone: leadPhone,
      leadCountry,
      lead:
        leadId || leadFullName || leadEmail || leadPhone || leadCountry ?
          {
            id: leadId,
            fullName: leadFullName,
            email: leadEmail,
            phone: leadPhone,
            mobile: leadPhone,
            leadCountry,
          }
        : null,
    };
  }

  function leadCountryAliases(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "all") {
      return [];
    }

    if (["india", "in", "ind"].includes(normalized)) {
      return ["India", "INDIA", "india", "IN", "in", "IND", "ind"];
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
        "UAE",
        "uae",
        "U.A.E",
        "u.a.e",
        "AE",
        "ae",
        "Dubai",
        "dubai",
        "United Arab Emirates",
        "UNITED ARAB EMIRATES",
        "united arab emirates",
        "Emirates",
        "emirates",
      ];
    }

    return [normalized];
  }

  function buildLeadCountryWhere(filters = {}, alias = "l") {
    if (filters.denyAll) return { condition: "1 = 0", params: [] };
    const conditions = [];
    const params = [];
    const requestedAliases = leadCountryAliases(
      filters.country || filters.market || filters.region || "",
    );
    if (requestedAliases.length) {
      conditions.push(`LOWER(TRIM(${alias}.lead_country)) IN (${requestedAliases.map(() => "?").join(", ")})`);
      params.push(...requestedAliases.map((value) => String(value).toLowerCase()));
    }
    if (filters.assignedTo) {
      conditions.push(`${alias}.assigned_to = ?`);
      params.push(filters.assignedTo);
    }
    if (Array.isArray(filters.allowedCountries)) {
      const allowedAliases = [...new Set(filters.allowedCountries.flatMap(leadCountryAliases))];
      if (!allowedAliases.length && filters.strictCountryScope) {
        conditions.push("1 = 0");
      } else if (allowedAliases.length) {
        conditions.push(`LOWER(TRIM(${alias}.lead_country)) IN (${allowedAliases.map(() => "?").join(", ")})`);
        params.push(...allowedAliases.map((value) => String(value).toLowerCase()));
      }
    }
    return { condition: conditions.join(" AND "), params };
  }

  async function buildLeadJoinIdExpression(bookingAlias = "b", quotationAlias = "q") {
    const hasBookingLeadId = await hasColumn(schema.bookingsTable, "lead_id");
    return hasBookingLeadId
      ? `COALESCE(${bookingAlias}.lead_id, ${quotationAlias}.lead_id)`
      : `${quotationAlias}.lead_id`;
  }

  function appendWhere(baseSql, condition) {
    if (!condition) {
      return baseSql;
    }

    return baseSql ? `${baseSql} AND ${condition}` : `WHERE ${condition}`;
  }

  function toPositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  function buildListWhere(mapped = {}) {
    const conditions = [];
    const params = [];

    if (mapped.booking_id) {
      conditions.push("p.booking_id = ?");
      params.push(mapped.booking_id);
    }
    if (mapped.status) {
      conditions.push("p.status = ?");
      params.push(mapped.status);
    }
    if (mapped.payment_mode) {
      conditions.push("p.payment_mode = ?");
      params.push(mapped.payment_mode);
    }
    if (mapped.is_verified !== undefined) {
      conditions.push("COALESCE(p.is_verified, FALSE) = ?");
      params.push(mapped.is_verified ? 1 : 0);
    }
    const leadCountryWhere = buildLeadCountryWhere(mapped, "l");
    if (leadCountryWhere.condition) {
      conditions.push(leadCountryWhere.condition);
      params.push(...leadCountryWhere.params);
    }

    return {
      whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
      params,
    };
  }

  function toBooking(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      leadId: row.lead_id ?? row.leadId ?? null,
      totalAmount: toNumber(row.total_amount ?? row.totalAmount, 0),
      advanceRequired: toNumber(row.advance_required ?? row.advanceRequired, 0),
      advanceReceived: toNumber(row.advance_received ?? row.advanceReceived, 0),
      status: row.status ?? "PENDING",
      paymentStatus: row.payment_status ?? row.paymentStatus ?? "PENDING",
      isDeleted: toBoolean(row.is_deleted ?? row.isDeleted, false),
    };
  }

  async function hasTable(tableName) {
    if (!canUseRawQuery()) {
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
    if (!canUseRawQuery()) {
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

  async function hasColumnFresh(tableName, columnName) {
    let exists = await hasColumn(tableName, columnName);
    if (exists) {
      return true;
    }

    if (!canUseRawQuery()) {
      return exists;
    }

    // Column metadata can become stale when migrations run while server is live.
    columnCache.delete(tableName);
    exists = await hasColumn(tableName, columnName);
    return exists;
  }

  async function buildBookingCurrencyExpression(
    bookingAlias = "b",
    _quotationAlias = "q",
    leadAlias = "l",
  ) {
    let hasBookingClientCurrency = false;
    let hasLeadClientCurrency = false;

    try {
      hasBookingClientCurrency = await hasColumn(
        schema.bookingsTable,
        "client_currency",
      );
      hasLeadClientCurrency = await hasColumn(
        schema.leadsTable,
        "client_currency",
      );
    } catch (error) {
      logger?.warn?.(
        {
          err: error,
          module: "payments",
        },
        "Unable to inspect booking-related currency columns for payment stats",
      );
    }

    const currencySources = [];
    if (hasBookingClientCurrency) {
      currencySources.push(`NULLIF(TRIM(${bookingAlias}.client_currency), '')`);
    }
    if (hasLeadClientCurrency) {
      currencySources.push(`NULLIF(TRIM(${leadAlias}.client_currency), '')`);
    }
    currencySources.push("'AED'");

    return `UPPER(COALESCE(
      ${currencySources.join(",\n      ")}
    ))`;
  }

  async function buildPaymentCurrencyExpression(
    _paymentAlias = "p",
    bookingAlias = "b",
    quotationAlias = "q",
    leadAlias = "l",
  ) {
    return buildBookingCurrencyExpression(
      bookingAlias,
      quotationAlias,
      leadAlias,
    );
  }

  function mapListFilters(filters = {}) {
    const mapped = {};

    if (filters.bookingId) {
      mapped.booking_id = filters.bookingId;
    }
    if (filters.status) {
      mapped.status = filters.status;
    }
    if (filters.paymentMode) {
      mapped.payment_mode = filters.paymentMode;
    }
    if (filters.isVerified !== undefined) {
      mapped.is_verified = filters.isVerified;
    }
    if (filters.page) {
      mapped.page = filters.page;
    }
    if (filters.limit) {
      mapped.limit = filters.limit;
    }
    if (filters.market) {
      mapped.market = filters.market;
    }
    if (filters.country) {
      mapped.country = filters.country;
    }
    if (filters.region) {
      mapped.region = filters.region;
    }
    if (filters.assignedTo) mapped.assignedTo = filters.assignedTo;
    if (filters.allowedCountries) mapped.allowedCountries = filters.allowedCountries;
    if (filters.strictCountryScope) mapped.strictCountryScope = true;
    if (filters.denyAll) mapped.denyAll = true;

    return mapped;
  }

  async function getProcessedRefundAmount(bookingId) {
    const tableExists = await hasTable(schema.refundsTable);
    if (!tableExists) {
      return 0;
    }

    if (canUseRawQuery()) {
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

    const rows = await db.findMany(schema.refundsTable, {
      booking_id: bookingId,
    });
    return rows
      .filter((row) => (row.status ?? "INITIATED") === "PROCESSED")
      .reduce(
        (sum, row) => sum + toNumber(row.refund_amount ?? row.refundAmount, 0),
        0,
      );
  }

  return Object.freeze({
    async getStatsBreakdown(filters = {}) {
      const [paymentsTableExists, bookingsTableExists, refundsTableExists] =
        await Promise.all([
          hasTable(schema.tableName),
          hasTable(schema.bookingsTable),
          hasTable(schema.refundsTable),
        ]);

      const emptyBreakdown = {
        collected: [],
        outstanding: [],
        overdue: [],
        refunds: [],
      };

      if (!paymentsTableExists && !bookingsTableExists && !refundsTableExists) {
        return emptyBreakdown;
      }

      if (canUseRawQuery()) {
        const normalizeBreakdownRows = (
          rows,
          amountKey = "amount",
          countKey = "count",
        ) =>
          (rows || [])
            .map((row) => ({
              currency: String(row?.currency || "AED").trim().toUpperCase() || "AED",
              amount: toNumber(row?.[amountKey], 0),
              count: toNumber(row?.[countKey], 0),
            }))
            .filter((row) => row.amount > 0 || row.count > 0);

        let hasPaidAt = true;
        let hasCreatedAt = true;
        try {
          hasPaidAt = await hasColumn(schema.tableName, "paid_at");
          hasCreatedAt = await hasColumn(schema.tableName, "created_at");
        } catch (error) {
          logger?.warn?.(
            { err: error, table: schema.tableName },
            "Unable to inspect payments table columns for payment stats",
          );
        }

        const paymentCurrencyExpression = bookingsTableExists
          ? await buildPaymentCurrencyExpression("p", "b", "q", "l")
          : "UPPER(COALESCE(NULLIF(TRIM(p.currency), ''), 'AED'))";
        const paymentOverdueDatePredicate =
          hasPaidAt && hasCreatedAt
            ? "DATE(COALESCE(p.paid_at, p.created_at)) < CURRENT_DATE"
            : hasCreatedAt
              ? "DATE(p.created_at) < CURRENT_DATE"
              : hasPaidAt
                ? "DATE(p.paid_at) < CURRENT_DATE"
                : "FALSE";
        const leadCountryWhere = buildLeadCountryWhere(filters, "l");
        const leadJoinIdExpression = bookingsTableExists
          ? await buildLeadJoinIdExpression("b", "q")
          : "q.lead_id";
        const paymentStatsWhere = bookingsTableExists
          ? appendWhere("", leadCountryWhere.condition)
          : "";
        const paymentStatsQuery = bookingsTableExists
          ? `
          SELECT
            ${paymentCurrencyExpression} AS currency,
	            COALESCE(SUM(
	              CASE WHEN (
	                  COALESCE(p.is_verified, FALSE) = TRUE
	                  OR COALESCE(p.status, 'PENDING') = 'FULL'
	                )
	                AND COALESCE(p.status, 'PENDING') <> 'REFUNDED'
	                THEN p.amount ELSE 0 END
	            ), 0) AS amount,
	            SUM(
	              CASE WHEN (
	                  COALESCE(p.is_verified, FALSE) = TRUE
	                  OR COALESCE(p.status, 'PENDING') = 'FULL'
	                )
	                AND COALESCE(p.status, 'PENDING') <> 'REFUNDED'
	                THEN 1 ELSE 0 END
	            ) AS count,
	            COALESCE(SUM(
	              CASE WHEN COALESCE(p.is_verified, FALSE) = FALSE
	                AND COALESCE(p.status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                THEN p.amount ELSE 0 END
	            ), 0) AS outstanding_amount,
	            SUM(
	              CASE WHEN COALESCE(p.is_verified, FALSE) = FALSE
	                AND COALESCE(p.status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                THEN 1 ELSE 0 END
	            ) AS outstanding_count,
	            COALESCE(SUM(
	              CASE WHEN COALESCE(p.is_verified, FALSE) = FALSE
	                AND COALESCE(p.status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                AND ${paymentOverdueDatePredicate}
	                THEN p.amount ELSE 0 END
	            ), 0) AS overdue_amount,
	            SUM(
	              CASE WHEN COALESCE(p.is_verified, FALSE) = FALSE
	                AND COALESCE(p.status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                AND ${paymentOverdueDatePredicate}
	                THEN 1 ELSE 0 END
	            ) AS overdue_count
          FROM ${schema.tableName} p
          LEFT JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = ${leadJoinIdExpression}
          ${paymentStatsWhere}
          GROUP BY ${paymentCurrencyExpression}
        `
          : `
          SELECT
            UPPER(COALESCE(NULLIF(currency, ''), 'AED')) AS currency,
	            COALESCE(SUM(
	              CASE WHEN (
	                  COALESCE(is_verified, FALSE) = TRUE
	                  OR COALESCE(status, 'PENDING') = 'FULL'
	                )
	                AND COALESCE(status, 'PENDING') <> 'REFUNDED'
	                THEN amount ELSE 0 END
	            ), 0) AS amount,
	            SUM(
	              CASE WHEN (
	                  COALESCE(is_verified, FALSE) = TRUE
	                  OR COALESCE(status, 'PENDING') = 'FULL'
	                )
	                AND COALESCE(status, 'PENDING') <> 'REFUNDED'
	                THEN 1 ELSE 0 END
	            ) AS count,
	            COALESCE(SUM(
	              CASE WHEN COALESCE(is_verified, FALSE) = FALSE
	                AND COALESCE(status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                THEN amount ELSE 0 END
	            ), 0) AS outstanding_amount,
	            SUM(
	              CASE WHEN COALESCE(is_verified, FALSE) = FALSE
	                AND COALESCE(status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                THEN 1 ELSE 0 END
	            ) AS outstanding_count,
	            COALESCE(SUM(
	              CASE WHEN COALESCE(is_verified, FALSE) = FALSE
	                AND COALESCE(status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                AND ${paymentOverdueDatePredicate.replaceAll("p.", "")}
	                THEN amount ELSE 0 END
	            ), 0) AS overdue_amount,
	            SUM(
	              CASE WHEN COALESCE(is_verified, FALSE) = FALSE
	                AND COALESCE(status, 'PENDING') NOT IN ('FULL', 'REFUNDED')
	                AND ${paymentOverdueDatePredicate.replaceAll("p.", "")}
	                THEN 1 ELSE 0 END
            ) AS overdue_count
          FROM ${schema.tableName}
          GROUP BY UPPER(COALESCE(NULLIF(currency, ''), 'AED'))
        `;

        let refundPromise = Promise.resolve({ rows: [] });
        if (refundsTableExists) {
          if (bookingsTableExists) {
            const refundsCurrencyExpression =
              await buildBookingCurrencyExpression("b", "q", "l");

            refundPromise = db.query(
              `
                SELECT
                  ${refundsCurrencyExpression} AS currency,
                  COALESCE(SUM(r.refund_amount), 0) AS amount,
                  COUNT(*) AS count
                FROM ${schema.refundsTable} r
                LEFT JOIN ${schema.bookingsTable} b ON b.id = r.booking_id
                LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
                LEFT JOIN ${schema.leadsTable} l ON l.id = ${leadJoinIdExpression}
                WHERE r.status = 'PROCESSED'
                  ${leadCountryWhere.condition ? `AND ${leadCountryWhere.condition}` : ""}
                GROUP BY ${refundsCurrencyExpression}
              `,
              leadCountryWhere.params,
            );
          } else {
            refundPromise = db.query(
              `
                SELECT
                  'AED' AS currency,
                  COALESCE(SUM(refund_amount), 0) AS amount,
                  COUNT(*) AS count
                FROM ${schema.refundsTable}
                WHERE status = 'PROCESSED'
              `,
            );
          }
        }

        const statsParams = bookingsTableExists ? leadCountryWhere.params : [];
        const collectedPromise = paymentsTableExists
          ? db.query(paymentStatsQuery, statsParams)
          : Promise.resolve({ rows: [] });
        const [collectedResult, refundResult] = await Promise.all([
          collectedPromise,
          refundPromise,
        ]);
        const refundBreakdown = normalizeBreakdownRows(
          refundResult.rows,
          "amount",
          "count",
        );

        return {
          collected: normalizeBreakdownRows(collectedResult.rows, "amount", "count"),
          outstanding: normalizeBreakdownRows(
            collectedResult.rows,
            "outstanding_amount",
            "outstanding_count",
          ),
          overdue: normalizeBreakdownRows(
            collectedResult.rows,
            "overdue_amount",
            "overdue_count",
          ),
          refunds: refundBreakdown,
        };
      }

      const payments = paymentsTableExists
        ? await db.findMany(schema.tableName, {})
        : [];
      const addToBreakdown = (accumulator, currency, amount, count = 0) => {
        const code = String(currency || "AED").trim().toUpperCase() || "AED";
        if (!accumulator[code]) {
          accumulator[code] = { currency: code, amount: 0, count: 0 };
        }
        accumulator[code].amount += toNumber(amount, 0);
        accumulator[code].count += toNumber(count, 0);
      };

      const collectedMap = {};
      const bookings = bookingsTableExists
        ? await db.findMany(schema.bookingsTable, {})
        : [];
      const quotations = bookingsTableExists
        ? await db.findMany(schema.quotationsTable, {})
        : [];
      const leads = bookingsTableExists
        ? await db.findMany(schema.leadsTable, {})
        : [];
      const today = new Date();
      const outstandingMap = {};
      const overdueMap = {};
      const quotationById = quotations.reduce((accumulator, quotationRow) => {
        if (quotationRow?.id) {
          accumulator[String(quotationRow.id)] = quotationRow;
        }
        return accumulator;
      }, {});
      const leadById = leads.reduce((accumulator, leadRow) => {
        if (leadRow?.id) {
          accumulator[String(leadRow.id)] = leadRow;
        }
        return accumulator;
      }, {});
      const refunds = refundsTableExists
        ? await db.findMany(schema.refundsTable, {})
        : [];
      const bookingById = bookings.reduce((accumulator, bookingRow) => {
        if (bookingRow?.id) {
          accumulator[String(bookingRow.id)] = bookingRow;
        }
        return accumulator;
      }, {});
      const countryAliases = leadCountryAliases(
        filters.country || filters.market || filters.region || "",
      );
      const matchesLeadCountry = (lead) => {
        if (!countryAliases.length) {
          return true;
        }
        const country = String(
          lead?.lead_country ?? lead?.leadCountry ?? "",
        ).trim().toLowerCase();
        return countryAliases.includes(country);
      };
      const refundsMap = {};
      refunds
        .filter((row) => (row.status ?? "INITIATED") === "PROCESSED")
        .forEach((row) => {
          const bookingRow = bookingById[String(row.booking_id ?? row.bookingId ?? "")];
          const quotation =
            quotationById[
              String(bookingRow?.quotation_id ?? bookingRow?.quotationId ?? "")
            ];
          const lead =
            leadById[
              String(quotation?.lead_id ?? quotation?.leadId ?? "")
            ];
          if (!matchesLeadCountry(lead)) {
            return;
          }
          const bookingCurrency =
            bookingRow?.client_currency ??
            bookingRow?.clientCurrency ??
            lead?.client_currency ??
            lead?.clientCurrency ??
            "AED";
          addToBreakdown(
            refundsMap,
            bookingCurrency,
            toNumber(row.refund_amount ?? row.refundAmount, 0),
            1,
          );
        });

      payments
        .filter((row) => {
          const status = String(row.status ?? "PENDING").toUpperCase();
          return (
            toBoolean(row.is_verified ?? row.isVerified, false) ||
            status === "FULL"
          );
        })
        .filter((row) => (row.status ?? "PENDING") !== "REFUNDED")
        .forEach((row) => {
          const bookingRow =
            bookingById[String(row.booking_id ?? row.bookingId ?? "")];
          const quotation =
            quotationById[
              String(bookingRow?.quotation_id ?? bookingRow?.quotationId ?? "")
            ];
          const lead =
            leadById[
              String(quotation?.lead_id ?? quotation?.leadId ?? "")
            ];
          if (!matchesLeadCountry(lead)) {
            return;
          }
          const paymentCurrency =
            bookingRow?.client_currency ??
            bookingRow?.clientCurrency ??
            lead?.client_currency ??
            lead?.clientCurrency ??
            "AED";
          addToBreakdown(
            collectedMap,
            paymentCurrency,
            toNumber(row.amount, 0),
            1,
          );
        });

      payments
        .filter((row) => !toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => {
          const status = String(row.status ?? "PENDING").toUpperCase();
          return !["FULL", "REFUNDED"].includes(status);
        })
        .forEach((row) => {
          const bookingRow =
            bookingById[String(row.booking_id ?? row.bookingId ?? "")];
          const quotation =
            quotationById[
              String(bookingRow?.quotation_id ?? bookingRow?.quotationId ?? "")
            ];
          const lead =
            leadById[
              String(quotation?.lead_id ?? quotation?.leadId ?? "")
            ];
          if (!matchesLeadCountry(lead)) {
            return;
          }
          const paymentCurrency =
            bookingRow?.client_currency ??
            bookingRow?.clientCurrency ??
            lead?.client_currency ??
            lead?.clientCurrency ??
            "AED";
          const amount = toNumber(row.amount, 0);
          addToBreakdown(
            outstandingMap,
            paymentCurrency,
            amount,
            1,
          );

          const overdueBase =
            row.paid_at ??
            row.paidAt ??
            row.created_at ??
            row.createdAt ??
            null;
          if (!overdueBase) {
            return;
          }
          const overdueDate = new Date(overdueBase);
          if (!Number.isNaN(overdueDate.getTime()) && overdueDate < today) {
            addToBreakdown(
              overdueMap,
              paymentCurrency,
              amount,
              1,
            );
          }
        });

      return {
        collected: Object.values(collectedMap),
        outstanding: Object.values(outstandingMap),
        overdue: Object.values(overdueMap),
        refunds: Object.values(refundsMap),
      };
    },
    async getStats(filters = {}) {
      const breakdown = await this.getStatsBreakdown(filters);
      const sumBucket = (rows = []) =>
        rows.reduce(
          (accumulator, row) => ({
            amount: accumulator.amount + toNumber(row.amount, 0),
            count: accumulator.count + toNumber(row.count, 0),
          }),
          { amount: 0, count: 0 },
        );

      const collected = sumBucket(breakdown.collected);
      const outstanding = sumBucket(breakdown.outstanding);
      const overdue = sumBucket(breakdown.overdue);
      const refunds = sumBucket(breakdown.refunds);

      return {
        collectedAmount: collected.amount,
        collectedCount: collected.count,
        outstandingAmount: outstanding.amount,
        outstandingCount: outstanding.count,
        overdueAmount: overdue.amount,
        overdueCount: overdue.count,
        refundsAmount: refunds.amount,
        refundsCount: refunds.count,
      };
    },
    async findAll(filters = {}) {
      const mapped = mapListFilters(filters);

      if (canUseRawQuery()) {
        const { whereSql, params } = buildListWhere(mapped);
        const limit = toPositiveInt(mapped.limit);
        const page = toPositiveInt(mapped.page) || 1;
        const offset = limit ? (page - 1) * limit : 0;

        const derivedCurrencyExpression = await buildPaymentCurrencyExpression(
          "p",
          "b",
          "q",
          "l",
        );
        const leadJoinIdExpression = await buildLeadJoinIdExpression("b", "q");

        let query = `
          SELECT
            p.*,
            ${derivedCurrencyExpression} AS derived_currency,
            b.booking_number,
            ${leadJoinIdExpression} AS lead_id,
            l.full_name AS lead_full_name,
            l.email AS lead_email,
            l.phone AS lead_phone,
            l.lead_country AS lead_country,
            u.full_name AS verified_by_name
          FROM ${schema.tableName} p
          LEFT JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = ${leadJoinIdExpression}
          LEFT JOIN ${schema.usersTable} u ON u.id = p.verified_by
          ${whereSql}
          ORDER BY p.created_at DESC
        `;

        const queryParams = [...params];
        if (limit) {
          query += " LIMIT ? OFFSET ?";
          queryParams.push(limit, offset);
        }

        const result = await db.query(query, queryParams);
        return (result.rows || []).map((row) => toPayment(row));
      }

      const rows = await db.findMany(schema.tableName, mapped);
      return rows
        .map((row) => toPayment(row))
        .sort((a, b) => {
          const left = new Date(a.createdAt || 0).getTime();
          const right = new Date(b.createdAt || 0).getTime();
          return right - left;
        });
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toPayment(row);
    },

    async create(payload) {
      logger.debug({ module: "payments", payload }, "Creating payment");
      const normalizedPayload = { ...payload };
      let hasInvoiceUrlColumn = true;
      try {
        hasInvoiceUrlColumn = await hasColumnFresh(
          schema.tableName,
          "invoice_url",
        );
      } catch (_error) {
        hasInvoiceUrlColumn = true;
      }
      if (!hasInvoiceUrlColumn) {
        delete normalizedPayload.invoice_url;
      }
      const row = await db.insert(schema.tableName, normalizedPayload);
      return toPayment(row);
    },

    async update(id, payload) {
      logger.debug({ module: "payments", id, payload }, "Updating payment");
      const normalizedPayload = { ...payload };
      let hasInvoiceUrlColumn = true;
      try {
        hasInvoiceUrlColumn = await hasColumnFresh(
          schema.tableName,
          "invoice_url",
        );
      } catch (_error) {
        hasInvoiceUrlColumn = true;
      }
      if (!hasInvoiceUrlColumn) {
        delete normalizedPayload.invoice_url;
      }
      const row = await db.update(schema.tableName, id, normalizedPayload);
      return toPayment(row);
    },

    async findBookingById(id) {
      if (canUseRawQuery()) {
        const leadJoinIdExpression = await buildLeadJoinIdExpression("b", "q");
        const result = await db.query(
          `
            SELECT b.*, ${leadJoinIdExpression} AS resolved_lead_id
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            WHERE b.id = ?
            LIMIT 1
          `,
          [id],
        );
        const row = result.rows?.[0] || null;
        return row
          ? toBooking({
              ...row,
              lead_id: row.resolved_lead_id ?? row.lead_id ?? null,
            })
          : null;
      }
      const row = await db.findById(schema.bookingsTable, id);
      return toBooking(row);
    },

    async updateBooking(id, payload) {
      const row = await db.update(schema.bookingsTable, id, payload);
      return toBooking(row);
    },

    async getVerifiedPaidAmount(bookingId) {
      if (canUseRawQuery()) {
        const result = await db.query(
          `
            SELECT COALESCE(SUM(amount), 0) AS paid_amount
	            FROM ${schema.tableName}
	            WHERE booking_id = ?
	              AND (
	                COALESCE(is_verified, FALSE) = TRUE
	                OR COALESCE(status, 'PENDING') = 'FULL'
	              )
	              AND COALESCE(status, 'PENDING') <> 'REFUNDED'
          `,
          [bookingId],
        );

        return toNumber(result.rows[0]?.paid_amount, 0);
      }

      const rows = await db.findMany(schema.tableName, {
        booking_id: bookingId,
      });
      return rows
        .filter((row) => toBoolean(row.is_verified ?? row.isVerified, false))
        .filter((row) => (row.status ?? "PENDING") !== "REFUNDED")
        .reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    },

    getProcessedRefundAmount,
  });
}

export { createPaymentsRepository };
