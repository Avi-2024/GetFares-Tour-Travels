function createReportsRepository({ db, schema }) {
  function getAdapterName() {
    return String(db.adapter || "").toLowerCase();
  }

  function canUseRawQuery() {
    const adapter = getAdapterName();
    return (
      typeof db.query === "function" &&
      Boolean(db.pool) &&
      adapter === "mysql"
    );
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function buildDateRangeClause(columnName, filters = {}, startIndex = 1) {
    const clauses = [];
    const params = [];
    let nextIndex = startIndex;

    if (filters.from) {
      clauses.push(`${columnName} >= ?`);
      params.push(filters.from);
      nextIndex += 1;
    }

    if (filters.to) {
      clauses.push(`${columnName} <= ?`);
      params.push(filters.to);
      nextIndex += 1;
    }

    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
      nextIndex,
    };
  }

  async function queryRows(sql, params = []) {
    if (!canUseRawQuery()) {
      return [];
    }
    try {
      const result = await db.query(sql, params);
      return result.rows;
    } catch (_error) {
      return [];
    }
  }

  return Object.freeze({
    async getLeadsBySource(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            COALESCE(l.source, 'UNKNOWN') AS source,
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
          FROM ${schema.leadsTable} l
          ${range.sql}
          GROUP BY COALESCE(l.source, 'UNKNOWN')
          ORDER BY total_leads DESC
        `,
        range.params,
      );

      return rows.map((row) => {
        const total = toNumber(row.total_leads, 0);
        const converted = toNumber(row.converted_leads, 0);
        return {
          source: row.source,
          totalLeads: total,
          convertedLeads: converted,
          conversionRatePercent:
            total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0,
        };
      });
    },

    async getLeadsByConsultant(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const params = [...range.params];
      const whereClauses = range.sql
        ? [range.sql.replace(/^WHERE\s+/i, "")]
        : [];

      if (filters.userId) {
        whereClauses.push(`l.assigned_to = $${params.length + 1}`);
        params.push(filters.userId);
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

      const rows = await queryRows(
        `
          SELECT
            u.id AS user_id,
            u.full_name AS consultant_name,
            COUNT(l.id) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads,
            AVG(
              CASE
                WHEN l.response_at IS NOT NULL AND l.created_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, l.created_at, l.response_at)
                ELSE NULL
              END
            ) AS avg_response_minutes
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.leadsTable} l ON l.assigned_to = u.id
          ${whereSql}
          GROUP BY u.id, u.full_name
          HAVING COUNT(l.id) > 0
          ORDER BY converted_leads DESC, total_leads DESC
        `,
        params,
      );

      return rows.map((row) => {
        const total = toNumber(row.total_leads, 0);
        const converted = toNumber(row.converted_leads, 0);
        return {
          userId: row.user_id,
          consultantName: row.consultant_name,
          totalLeads: total,
          convertedLeads: converted,
          conversionRatePercent:
            total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0,
          averageResponseMinutes: toNumber(row.avg_response_minutes, 0),
        };
      });
    },

    async getLeadAgingReport(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            l.id,
            l.full_name,
            l.status,
            l.assigned_to,
            u.full_name AS consultant_name,
            l.created_at,
            TIMESTAMPDIFF(HOUR, l.created_at, CURRENT_TIMESTAMP) AS age_hours
          FROM ${schema.leadsTable} l
          LEFT JOIN ${schema.usersTable} u ON u.id = l.assigned_to
          ${range.sql}
          ORDER BY l.created_at ASC
        `,
        range.params,
      );

      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        status: row.status,
        assignedTo: row.assigned_to,
        consultantName: row.consultant_name,
        createdAt: row.created_at,
        ageHours: Number(toNumber(row.age_hours, 0).toFixed(2)),
      }));
    },

    async getLostLeadReport(filters = {}) {
      const range = buildDateRangeClause("l.updated_at", filters);
      const rows = await queryRows(
        `
          SELECT
            l.id,
            l.full_name,
            l.source,
            l.closed_reason,
            l.updated_at AS lost_at
          FROM ${schema.leadsTable} l
          WHERE l.status = 'LOST'
          ${range.sql ? `AND ${range.sql.replace(/^WHERE\s+/i, "")}` : ""}
          ORDER BY l.updated_at DESC
        `,
        range.params,
      );

      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        source: row.source,
        closedReason: row.closed_reason || "UNSPECIFIED",
        lostAt: row.lost_at,
      }));
    },

    async getRevenueByMonth(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            DATE_FORMAT(b.created_at, '%Y-%m') AS month,
            SUM(COALESCE(b.total_amount, 0)) AS revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS cost,
            SUM(COALESCE(b.total_amount, 0) - COALESCE(b.cost_amount, 0)) AS profit
          FROM ${schema.bookingsTable} b
          ${range.sql}
          GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
          ORDER BY DATE_FORMAT(b.created_at, '%Y-%m')
        `,
        range.params,
      );

      return rows.map((row) => ({
        month: row.month,
        revenue: toNumber(row.revenue, 0),
        cost: toNumber(row.cost, 0),
        profit: toNumber(row.profit, 0),
      }));
    },

    async getRevenueByServiceType(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const rows = await queryRows(
        `
          WITH base AS (
            SELECT
              b.id AS booking_id,
              b.total_amount,
              CASE WHEN vc.id IS NULL THEN 'HOLIDAY' ELSE 'VISA' END AS service_type
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.visaCasesTable} vc ON vc.booking_id = b.id
            ${range.sql}
          )
          SELECT
            service_type,
            COUNT(*) AS total_bookings,
            SUM(COALESCE(total_amount, 0)) AS revenue
          FROM base
          GROUP BY service_type
          ORDER BY revenue DESC
        `,
        range.params,
      );

      return rows.map((row) => ({
        serviceType: row.service_type,
        totalBookings: toNumber(row.total_bookings, 0),
        revenue: toNumber(row.revenue, 0),
      }));
    },

    async getRevenueByDestination(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            COALESCE(d.name, 'UNKNOWN') AS destination,
            COUNT(*) AS total_bookings,
            SUM(COALESCE(b.total_amount, 0)) AS revenue
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
          ${range.sql}
          GROUP BY COALESCE(d.name, 'UNKNOWN')
          ORDER BY revenue DESC
        `,
        range.params,
      );

      return rows.map((row) => ({
        destination: row.destination,
        totalBookings: toNumber(row.total_bookings, 0),
        revenue: toNumber(row.revenue, 0),
      }));
    },

    async getTargetVsAchievement(filters = {}) {
      const params = [];
      const where = [];
      if (filters.from) {
        params.push(filters.from);
        where.push(`b.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`b.created_at <= ?`);
      }
      if (filters.userId) {
        params.push(filters.userId);
        where.push(`u.id = ?`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const rows = await queryRows(
        `
          SELECT
            u.id AS user_id,
            u.full_name,
            COALESCE(u.target_amount, 0) AS target_amount,
            SUM(COALESCE(b.total_amount, 0)) AS achieved_amount
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.quotationsTable} q ON q.created_by = u.id
          LEFT JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          ${whereSql}
          GROUP BY u.id, u.full_name, u.target_amount
          ORDER BY achieved_amount DESC
        `,
        params,
      );

      return rows.map((row) => {
        const target = toNumber(row.target_amount, 0);
        const achieved = toNumber(row.achieved_amount, 0);
        return {
          userId: row.user_id,
          fullName: row.full_name,
          targetAmount: target,
          achievedAmount: achieved,
          achievementPercent:
            target > 0 ? Number(((achieved / target) * 100).toFixed(2)) : 0,
        };
      });
    },

    async getOutstandingPayments(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            b.id AS booking_id,
            b.booking_number,
            b.total_amount,
            b.advance_received,
            (COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0)) AS outstanding_amount,
            b.payment_status
          FROM ${schema.bookingsTable} b
          ${range.sql}
          ORDER BY outstanding_amount DESC
        `,
        range.params,
      );

      return rows
        .map((row) => ({
          bookingId: row.booking_id,
          bookingNumber: row.booking_number,
          totalAmount: toNumber(row.total_amount, 0),
          advanceReceived: toNumber(row.advance_received, 0),
          outstandingAmount: toNumber(row.outstanding_amount, 0),
          paymentStatus: row.payment_status,
        }))
        .filter((row) => row.outstandingAmount > 0);
    },

    async getPaymentModeReport(filters = {}) {
      const range = buildDateRangeClause("p.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            p.payment_mode,
            COUNT(*) AS total_payments,
            SUM(COALESCE(p.amount, 0)) AS total_amount
          FROM ${schema.paymentsTable} p
          ${range.sql}
          GROUP BY p.payment_mode
          ORDER BY total_amount DESC
        `,
        range.params,
      );

      return rows.map((row) => ({
        paymentMode: row.payment_mode,
        totalPayments: toNumber(row.total_payments, 0),
        totalAmount: toNumber(row.total_amount, 0),
      }));
    },

    async getProfitMarginReport(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_bookings,
            SUM(COALESCE(b.total_amount, 0)) AS total_revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS total_cost,
            SUM(COALESCE(b.total_amount, 0) - COALESCE(b.cost_amount, 0)) AS total_profit
          FROM ${schema.bookingsTable} b
          ${range.sql}
        `,
        range.params,
      );

      const row = rows[0] || {};
      const revenue = toNumber(row.total_revenue, 0);
      const profit = toNumber(row.total_profit, 0);

      return {
        totalBookings: toNumber(row.total_bookings, 0),
        totalRevenue: revenue,
        totalCost: toNumber(row.total_cost, 0),
        totalProfit: profit,
        marginPercent:
          revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
      };
    },

    async getFinanceCostBreakup(filters = {}) {
      const page = Math.max(toNumber(filters.page, 1), 1);
      const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 200);
      const offset = (page - 1) * limit;
      const params = [];
      const where = [];

      if (filters.from) {
        params.push(filters.from);
        where.push(`q.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`q.created_at <= ?`);
      }
      if (filters.currency) {
        params.push(String(filters.currency).trim().toUpperCase());
        where.push(`(
          UPPER(COALESCE(NULLIF(q.cost_currency, ''), '')) = ?
          OR UPPER(COALESCE(NULLIF(q.client_currency, ''), '')) = ?
          OR UPPER(COALESCE(NULLIF(q.supplier_currency, ''), '')) = ?
        )`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const summaryRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_quotes,
            SUM(COALESCE(q.supplier_cost, 0)) AS supplier_cost,
            SUM(COALESCE(q.supplier_tax_amount, 0)) AS supplier_tax_amount,
            SUM(COALESCE(q.markup_amount, 0)) AS markup_amount,
            SUM(COALESCE(q.service_fee_amount, 0)) AS service_fee_amount,
            SUM(COALESCE(q.gst_amount, 0)) AS gst_amount,
            SUM(COALESCE(q.tcs_amount, 0)) AS tcs_amount,
            SUM(COALESCE(q.total_sale_value, 0)) AS total_sale_value
          FROM ${schema.quotationsTable} q
          ${whereSql}
        `,
        params,
      );

      const breakdownRows = await queryRows(
        `
          SELECT
            COALESCE(
              NULLIF(q.client_currency, ''),
              NULLIF(q.cost_currency, ''),
              NULLIF(q.supplier_currency, ''),
              'INR'
            ) AS currency,
            COUNT(*) AS total_quotes,
            SUM(COALESCE(q.supplier_cost, 0)) AS supplier_cost,
            SUM(COALESCE(q.supplier_tax_amount, 0)) AS supplier_tax_amount,
            SUM(COALESCE(q.markup_amount, 0)) AS markup_amount,
            SUM(COALESCE(q.service_fee_amount, 0)) AS service_fee_amount,
            SUM(COALESCE(q.gst_amount, 0)) AS gst_amount,
            SUM(COALESCE(q.tcs_amount, 0)) AS tcs_amount,
            SUM(COALESCE(q.total_sale_value, 0)) AS total_sale_value
          FROM ${schema.quotationsTable} q
          ${whereSql}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        params,
      );

      const rowParams = [...params, limit, offset];
      const rows = await queryRows(
        `
          SELECT
            q.id,
            q.quote_number,
            q.lead_id,
            l.full_name AS lead_name,
            q.status,
            q.supplier_cost,
            q.supplier_tax_amount,
            q.markup_amount,
            q.service_fee_amount,
            q.gst_amount,
            q.tcs_amount,
            q.total_sale_value,
            q.cost_currency,
            q.client_currency,
            q.supplier_currency,
            q.created_at
          FROM ${schema.quotationsTable} q
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${whereSql}
          ORDER BY q.created_at DESC
          LIMIT $${rowParams.length - 1}
          OFFSET $${rowParams.length}
        `,
        rowParams,
      );

      const summary = summaryRows[0] || {};
      const totalItems = toNumber(summary.total_quotes, 0);

      return {
        summary: {
          totalQuotes: totalItems,
          supplierCost: toNumber(summary.supplier_cost, 0),
          supplierTaxAmount: toNumber(summary.supplier_tax_amount, 0),
          markupAmount: toNumber(summary.markup_amount, 0),
          serviceFeeAmount: toNumber(summary.service_fee_amount, 0),
          gstAmount: toNumber(summary.gst_amount, 0),
          tcsAmount: toNumber(summary.tcs_amount, 0),
          totalSaleValue: toNumber(summary.total_sale_value, 0),
        },
        currencyBreakdown: breakdownRows.map((row) => ({
          currency: row.currency || "INR",
          totalQuotes: toNumber(row.total_quotes, 0),
          supplierCost: toNumber(row.supplier_cost, 0),
          supplierTaxAmount: toNumber(row.supplier_tax_amount, 0),
          markupAmount: toNumber(row.markup_amount, 0),
          serviceFeeAmount: toNumber(row.service_fee_amount, 0),
          gstAmount: toNumber(row.gst_amount, 0),
          tcsAmount: toNumber(row.tcs_amount, 0),
          totalSaleValue: toNumber(row.total_sale_value, 0),
        })),
        rows: rows.map((row) => ({
          id: row.id,
          quoteNumber: row.quote_number,
          leadId: row.lead_id,
          leadName: row.lead_name || "Unknown Lead",
          status: row.status || "DRAFT",
          supplierCost: toNumber(row.supplier_cost, 0),
          supplierTaxAmount: toNumber(row.supplier_tax_amount, 0),
          markupAmount: toNumber(row.markup_amount, 0),
          serviceFeeAmount: toNumber(row.service_fee_amount, 0),
          gstAmount: toNumber(row.gst_amount, 0),
          tcsAmount: toNumber(row.tcs_amount, 0),
          totalSaleValue: toNumber(row.total_sale_value, 0),
          costCurrency: row.cost_currency || "INR",
          clientCurrency: row.client_currency || "INR",
          supplierCurrency: row.supplier_currency || "INR",
          effectiveCurrency:
            row.client_currency ||
            row.cost_currency ||
            row.supplier_currency ||
            "INR",
          createdAt: row.created_at,
        })),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      };
    },

    async getFinanceSupplierServices(filters = {}) {
      const page = Math.max(toNumber(filters.page, 1), 1);
      const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 200);
      const offset = (page - 1) * limit;
      const params = [];
      const where = ["COALESCE(q.is_deleted, FALSE) = FALSE"];

      if (filters.from) {
        params.push(filters.from);
        where.push(`q.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`q.created_at <= ?`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const quotationRows = await queryRows(
        `
          SELECT
            q.id AS quotation_id,
            q.quote_number,
            q.created_at,
            q.status AS quotation_status,
            q.lead_id,
            q.client_currency,
            q.cost_currency,
            q.supplier_currency,
            q.template_snapshot,
            b.id AS booking_id,
            b.booking_number,
            b.status AS booking_status,
            b.payment_status,
            COALESCE(b.advance_received, 0) AS advance_received
          FROM ${schema.quotationsTable} q
          INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          ${whereSql}
            AND COALESCE(b.is_deleted, FALSE) = FALSE
            AND (
              UPPER(COALESCE(NULLIF(TRIM(b.status), ''), '')) = 'CONFIRMED'
              OR COALESCE(b.advance_received, 0) > 0
              OR UPPER(COALESCE(NULLIF(TRIM(b.payment_status), ''), '')) IN ('PARTIAL', 'FULL', 'PAID', 'COMPLETED')
            )
          ORDER BY q.created_at DESC, q.quote_number ASC
        `,
        params,
      );

      const toSnapshot = (value) => {
        if (!value) return {};
        if (typeof value === "object") return value;
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      };

      const normalizeText = (value, fallback = "") => {
        const text = String(value || "").trim();
        return text || fallback;
      };

      const deriveServiceLabel = (service = {}) => {
        const key = normalizeText(service.key).toLowerCase();
        const itemType = normalizeText(service.itemType).toUpperCase();
        return (
          normalizeText(service.label) ||
          normalizeText(service.serviceName) ||
          ({
            hotel: "Accommodation",
            flights: "Flights",
            tours: "Tours & Activities",
            visa: "Visa Services",
            insurance: "Insurance",
            insurance2: "Land Arrangement",
          }[key] || "") ||
          ({
            HOTEL: "Accommodation",
            FLIGHT: "Flights",
            TRANSFER: "Land Arrangement",
            VISA: "Visa Services",
            INSURANCE: "Insurance",
            OTHER: "Other",
          }[itemType] || "") ||
          normalizeText(service.itemType) ||
          normalizeText(service.key) ||
          "Other"
        );
      };

      const leadIds = [...new Set(quotationRows.map((row) => row.lead_id).filter(Boolean))];
      const leadMap = new Map();
      if (leadIds.length > 0) {
        const placeholders = leadIds.map(() => "?").join(",");
        const leadRows = await queryRows(
          `SELECT id, full_name FROM ${schema.leadsTable} WHERE id IN (${placeholders})`,
          leadIds,
        );
        leadRows.forEach((row) => {
          leadMap.set(String(row.id), normalizeText(row.full_name, "Unknown lead"));
        });
      }

      const allRows = [];
      quotationRows.forEach((row) => {
        const snapshot = toSnapshot(row.template_snapshot);
        const serviceRows =
          Array.isArray(snapshot.serviceRows) ? snapshot.serviceRows
          : Array.isArray(snapshot.builderSnapshot?.serviceRows) ? snapshot.builderSnapshot.serviceRows
          : [];
        const supplierDetails = snapshot.supplierDetails || {};
        const quoteNumber = normalizeText(row.quote_number, String(row.quotation_id || "").slice(0, 8));
        const leadName = leadMap.get(String(row.lead_id || "")) || "Unknown lead";
        const currency =
          normalizeText(row.client_currency) ||
          normalizeText(row.cost_currency) ||
          normalizeText(row.supplier_currency) ||
          "INR";

        serviceRows.forEach((service, index) => {
          const supplierId =
            normalizeText(service?.supplierId) ||
            normalizeText(supplierDetails?.supplierId) ||
            "UNASSIGNED";
          if (filters.supplierId && String(filters.supplierId).trim() !== supplierId) {
            return;
          }

          allRows.push({
            id: `${row.quotation_id}-${index}`,
            quotationId: row.quotation_id,
            bookingId: row.booking_id,
            bookingNumber: row.booking_number,
            bookingStatus: row.booking_status,
            paymentStatus: row.payment_status,
            advanceReceived: toNumber(row.advance_received, 0),
            quoteNumber,
            leadName,
            serviceLabel: deriveServiceLabel(service),
            supplierId,
            supplierName:
              normalizeText(service?.supplierName) ||
              normalizeText(supplierDetails?.supplierName) ||
              "Not selected",
            basePrice: toNumber(service?.baseCost, 0),
            currency,
            quotationStatus: row.quotation_status,
            createdAt: row.created_at,
          });
        });
      });

      const totalItems = allRows.length;
      const rows = allRows.slice(offset, offset + limit);

      return {
        rows,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        },
      };
    },

    async getVisaSummary(filters = {}) {
      const range = buildDateRangeClause("vc.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_cases,
            SUM(CASE WHEN vc.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_cases,
            SUM(CASE WHEN vc.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_cases,
            SUM(CASE WHEN vc.status = 'DOCUMENT_PENDING' THEN 1 ELSE 0 END) AS pending_document_cases,
            AVG(
              CASE
                WHEN vc.submission_date IS NOT NULL AND vc.appointment_date IS NOT NULL
                THEN (vc.appointment_date - vc.submission_date)
                ELSE NULL
              END
            ) AS average_processing_days
          FROM ${schema.visaCasesTable} vc
          ${range.sql}
        `,
        range.params,
      );

      const row = rows[0] || {};
      const total = toNumber(row.total_cases, 0);
      const approved = toNumber(row.approved_cases, 0);
      const rejected = toNumber(row.rejected_cases, 0);

      return {
        totalCases: total,
        approvedCases: approved,
        rejectedCases: rejected,
        pendingDocumentCases: toNumber(row.pending_document_cases, 0),
        successRatePercent:
          total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0,
        rejectionRatePercent:
          total > 0 ? Number(((rejected / total) * 100).toFixed(2)) : 0,
        averageProcessingDays: toNumber(row.average_processing_days, 0),
      };
    },

    async getTodayFollowups(filters = {}) {
      const date = filters.date || new Date().toISOString().slice(0, 10);
      const rows = await queryRows(
        `
          SELECT
            f.id,
            f.lead_id,
            l.full_name,
            f.followup_type,
            f.followup_date,
            f.is_completed
          FROM ${schema.followupsTable} f
          LEFT JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          WHERE DATE(f.followup_date) = ?
          ORDER BY f.followup_date ASC
        `,
        [date],
      );

      return rows.map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        fullName: row.full_name,
        followupType: row.followup_type,
        followupDate: row.followup_date,
        isCompleted: row.is_completed,
      }));
    },

    async getMissedFollowups(filters = {}) {
      const date = filters.date || new Date().toISOString().slice(0, 10);
      const rows = await queryRows(
        `
          SELECT
            f.id,
            f.lead_id,
            l.full_name,
            f.followup_type,
            f.followup_date
          FROM ${schema.followupsTable} f
          LEFT JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          WHERE DATE(f.followup_date) < ?
            AND COALESCE(f.is_completed, FALSE) = FALSE
          ORDER BY f.followup_date ASC
        `,
        [date],
      );

      return rows.map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        fullName: row.full_name,
        followupType: row.followup_type,
        followupDate: row.followup_date,
      }));
    },

    async getCallLogReport(filters = {}) {
      const params = [];
      const where = [`UPPER(la.activity_type) LIKE 'CALL%'`];

      if (filters.from) {
        params.push(filters.from);
        where.push(`la.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`la.created_at <= ?`);
      }
      if (filters.userId) {
        params.push(filters.userId);
        where.push(`la.user_id = ?`);
      }

      const whereSql = `WHERE ${where.join(" AND ")}`;
      const rows = await queryRows(
        `
          SELECT
            la.id,
            la.lead_id,
            la.user_id,
            la.activity_type,
            la.notes,
            la.created_at,
            u.full_name AS consultant_name
          FROM ${schema.leadActivitiesTable} la
          LEFT JOIN ${schema.usersTable} u ON u.id = la.user_id
          ${whereSql}
          ORDER BY la.created_at DESC
        `,
        params,
      );

      return rows.map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        userId: row.user_id,
        consultantName: row.consultant_name,
        activityType: row.activity_type,
        notes: row.notes,
        createdAt: row.created_at,
      }));
    },

    async getMonthlySummary(filters = {}) {
      const where = [];
      const params = [];
      if (filters.from) {
        params.push(filters.from);
        where.push(`b.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`b.created_at <= ?`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const rows = await queryRows(
        `
          WITH lead_stats AS (
            SELECT
              COUNT(*) AS total_leads,
              SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
            FROM ${schema.leadsTable}
          ),
          booking_stats AS (
            SELECT
              COUNT(*) AS total_bookings,
              SUM(COALESCE(total_amount, 0)) AS revenue,
              SUM(COALESCE(cost_amount, 0)) AS cost
            FROM ${schema.bookingsTable} b
            ${whereSql}
          )
          SELECT
            ls.total_leads,
            ls.converted_leads,
            bs.total_bookings,
            bs.revenue,
            bs.cost,
            (COALESCE(bs.revenue, 0) - COALESCE(bs.cost, 0)) AS profit
          FROM lead_stats ls
          CROSS JOIN booking_stats bs
        `,
        params,
      );

      const row = rows[0] || {};
      const totalLeads = toNumber(row.total_leads, 0);
      const convertedLeads = toNumber(row.converted_leads, 0);
      const totalBookings = toNumber(row.total_bookings, 0);
      const revenue = toNumber(row.revenue, 0);
      const profit = toNumber(row.profit, 0);

      return {
        totalLeads,
        totalBookings,
        convertedLeads,
        conversionRatePercent:
          totalLeads > 0
            ? Number(((convertedLeads / totalLeads) * 100).toFixed(2))
            : 0,
        revenue,
        cost: toNumber(row.cost, 0),
        profit,
        avgBookingValue:
          totalBookings > 0 ? Number((revenue / totalBookings).toFixed(2)) : 0,
        avgMarginPercent:
          revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
      };
    },

    async getExecutiveKpis(filters = {}) {
      const bookingRange = buildDateRangeClause("b.created_at", filters);
      const leadRange = buildDateRangeClause("l.created_at", filters);
      const refundRange = buildDateRangeClause("r.created_at", filters);

      const bookingRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_bookings,
            SUM(COALESCE(b.total_amount, 0)) AS total_revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS total_cost,
            SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings
          FROM ${schema.bookingsTable} b
          ${bookingRange.sql}
        `,
        bookingRange.params,
      );

      const leadRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
          FROM ${schema.leadsTable} l
          ${leadRange.sql}
        `,
        leadRange.params,
      );

      const serviceRevenueRows = await queryRows(
        `
          WITH service_revenue AS (
            SELECT
              CASE WHEN vc.id IS NULL THEN 'HOLIDAY' ELSE 'VISA' END AS service_type,
              COALESCE(b.total_amount, 0) AS total_amount
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.visaCasesTable} vc ON vc.booking_id = b.id
            ${bookingRange.sql}
          )
          SELECT
            service_type,
            SUM(total_amount) AS revenue
          FROM service_revenue
          GROUP BY service_type
        `,
        bookingRange.params,
      );

      const followupRows = await queryRows(
        `
          SELECT
            SUM(
              CASE
                WHEN DATE(f.followup_date) >= CURRENT_DATE
                  AND COALESCE(f.is_completed, FALSE) = FALSE
                THEN 1
                ELSE 0
              END
            ) AS pending_followups,
            SUM(
              CASE
                WHEN DATE(f.followup_date) < CURRENT_DATE
                  AND COALESCE(f.is_completed, FALSE) = FALSE
                THEN 1
                ELSE 0
              END
            ) AS overdue_followups
          FROM ${schema.followupsTable} f
        `,
      );

      const activeAgentsRows = await queryRows(
        `
          SELECT
            COUNT(*) AS active_agents
          FROM ${schema.usersTable} u
          WHERE COALESCE(u.is_active, TRUE) = TRUE
            AND COALESCE(u.is_on_leave, FALSE) = FALSE
        `,
      );

      const refundRows = await queryRows(
        `
          SELECT
            AVG(
              CASE
                WHEN r.processed_at IS NOT NULL
                THEN TIMESTAMPDIFF(SECOND, r.created_at, r.processed_at) / 86400
                ELSE NULL
              END
            ) AS avg_refund_turnaround_days
          FROM ${schema.refundsTable} r
          ${refundRange.sql}
        `,
        refundRange.params,
      );

      const booking = bookingRows[0] || {};
      const leads = leadRows[0] || {};
      const followups = followupRows[0] || {};
      const active = activeAgentsRows[0] || {};
      const refunds = refundRows[0] || {};

      const totalLeads = toNumber(leads.total_leads, 0);
      const convertedLeads = toNumber(leads.converted_leads, 0);
      const totalBookings = toNumber(booking.total_bookings, 0);
      const totalRevenue = toNumber(booking.total_revenue, 0);
      const totalCost = toNumber(booking.total_cost, 0);
      const totalProfit = Number((totalRevenue - totalCost).toFixed(2));
      const cancelledBookings = toNumber(booking.cancelled_bookings, 0);

      const revenueByService = serviceRevenueRows.reduce(
        (accumulator, row) => {
          const serviceType = row.service_type === "VISA" ? "visa" : "holiday";
          accumulator[serviceType] += toNumber(row.revenue, 0);
          return accumulator;
        },
        { holiday: 0, visa: 0 },
      );

      return {
        totalLeads,
        convertedLeads,
        conversionRatePercent:
          totalLeads > 0
            ? Number(((convertedLeads / totalLeads) * 100).toFixed(2))
            : 0,
        totalBookings,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        avgBookingValue:
          totalBookings > 0
            ? Number((totalRevenue / totalBookings).toFixed(2))
            : 0,
        avgMarginPercent:
          totalRevenue > 0
            ? Number(((totalProfit / totalRevenue) * 100).toFixed(2))
            : 0,
        cancellationRatioPercent:
          totalBookings > 0
            ? Number(((cancelledBookings / totalBookings) * 100).toFixed(2))
            : 0,
        activeAgents: toNumber(active.active_agents, 0),
        pendingFollowups: toNumber(followups.pending_followups, 0),
        overdueFollowups: toNumber(followups.overdue_followups, 0),
        refundTurnaroundDaysAvg: toNumber(
          refunds.avg_refund_turnaround_days,
          0,
        ),
        holidayRevenue: Number(revenueByService.holiday.toFixed(2)),
        visaRevenue: Number(revenueByService.visa.toFixed(2)),
      };
    },

    async getConversionFunnel(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const rows = await queryRows(
        `
          SELECT
            l.status,
            COUNT(*) AS total
          FROM ${schema.leadsTable} l
          ${range.sql}
          GROUP BY l.status
        `,
        range.params,
      );

      const statusMap = new Map(
        rows.map((row) => [row.status, toNumber(row.total, 0)]),
      );

      const stages = [
        "OPEN",
        "CONTACTED",
        "WIP",
        "QUOTED",
        "FOLLOW_UP",
        "CONVERTED",
        "LOST",
        "NON_RESPONSIVE",
      ];
      const totalLeads = stages.reduce(
        (sum, stage) => sum + (statusMap.get(stage) || 0),
        0,
      );

      const funnel = stages.map((stage) => {
        const count = statusMap.get(stage) || 0;
        return {
          stage,
          count,
          sharePercent:
            totalLeads > 0
              ? Number(((count / totalLeads) * 100).toFixed(2))
              : 0,
        };
      });

      return {
        totalLeads,
        convertedLeads: statusMap.get("CONVERTED") || 0,
        lostLeads: statusMap.get("LOST") || 0,
        conversionRatePercent:
          totalLeads > 0
            ? Number(
                (
                  ((statusMap.get("CONVERTED") || 0) / totalLeads) *
                  100
                ).toFixed(2),
              )
            : 0,
        funnel,
      };
    },

    async getMarketingPerformance(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const rows = await queryRows(
        `
          WITH lead_stats AS (
            SELECT
              l.campaign_id,
              COUNT(*) AS total_leads,
              SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
            FROM ${schema.leadsTable} l
            ${range.sql}
            GROUP BY l.campaign_id
          ),
          booking_stats AS (
            SELECT
              l.campaign_id,
              COUNT(b.id) AS total_bookings,
              SUM(COALESCE(b.total_amount, 0)) AS revenue
            FROM ${schema.leadsTable} l
            LEFT JOIN ${schema.quotationsTable} q ON q.lead_id = l.id
            LEFT JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
            ${range.sql}
            GROUP BY l.campaign_id
          )
          SELECT
            c.id,
            c.name,
            c.source,
            COALESCE(c.budget, 0) AS budget,
            COALESCE(c.actual_spend, 0) AS actual_spend,
            COALESCE(ls.total_leads, 0) AS total_leads,
            COALESCE(ls.converted_leads, 0) AS converted_leads,
            COALESCE(bs.total_bookings, 0) AS total_bookings,
            COALESCE(bs.revenue, 0) AS revenue
          FROM ${schema.campaignsTable} c
          LEFT JOIN lead_stats ls ON ls.campaign_id = c.id
          LEFT JOIN booking_stats bs ON bs.campaign_id = c.id
          ORDER BY revenue DESC, total_leads DESC
        `,
        range.params,
      );

      return rows.map((row) => {
        const leads = toNumber(row.total_leads, 0);
        const convertedLeads = toNumber(row.converted_leads, 0);
        const spend = toNumber(row.actual_spend, 0);
        const revenue = toNumber(row.revenue, 0);

        return {
          id: row.id,
          name: row.name,
          source: row.source || "UNKNOWN",
          budget: toNumber(row.budget, 0),
          actualSpend: spend,
          totalLeads: leads,
          convertedLeads,
          totalBookings: toNumber(row.total_bookings, 0),
          conversionRatePercent:
            leads > 0 ? Number(((convertedLeads / leads) * 100).toFixed(2)) : 0,
          revenue,
          costPerLead: leads > 0 ? Number((spend / leads).toFixed(2)) : 0,
          roiPercent:
            spend > 0
              ? Number((((revenue - spend) / spend) * 100).toFixed(2))
              : 0,
        };
      });
    },

    async getSupplierPerformance(filters = {}) {
      const params = [];
      const where = [];

      if (filters.from) {
        params.push(filters.from);
        where.push(`vc.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`vc.created_at <= ?`);
      }
      if (filters.supplierId) {
        params.push(filters.supplierId);
        where.push(`s.id = ?`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await queryRows(
        `
          SELECT
            s.id,
            s.name,
            COUNT(vc.id) AS total_cases,
            SUM(CASE WHEN vc.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_cases,
            SUM(CASE WHEN vc.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_cases,
            SUM(CASE WHEN vc.status = 'DOCUMENT_PENDING' THEN 1 ELSE 0 END) AS pending_cases,
            AVG(COALESCE(vc.fees, 0)) AS avg_visa_fee,
            AVG(
              CASE
                WHEN vc.submission_date IS NOT NULL AND vc.appointment_date IS NOT NULL
                THEN (vc.appointment_date - vc.submission_date)
                ELSE NULL
              END
            ) AS avg_processing_days
          FROM ${schema.suppliersTable} s
          LEFT JOIN ${schema.visaCasesTable} vc ON vc.supplier_id = s.id
          ${whereSql}
          GROUP BY s.id, s.name
          HAVING COUNT(vc.id) > 0
          ORDER BY approved_cases DESC, total_cases DESC
        `,
        params,
      );

      return rows.map((row) => {
        const total = toNumber(row.total_cases, 0);
        const approved = toNumber(row.approved_cases, 0);
        const rejected = toNumber(row.rejected_cases, 0);
        return {
          id: row.id,
          name: row.name,
          totalCases: total,
          approvedCases: approved,
          rejectedCases: rejected,
          pendingCases: toNumber(row.pending_cases, 0),
          successRatePercent:
            total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0,
          rejectionRatePercent:
            total > 0 ? Number(((rejected / total) * 100).toFixed(2)) : 0,
          averageVisaFee: toNumber(row.avg_visa_fee, 0),
          averageProcessingDays: toNumber(row.avg_processing_days, 0),
        };
      });
    },

    async getPipelineForecast(filters = {}) {
      const periodMonths = Number(filters.periodMonths || 3);

      const openPipelineRows = await queryRows(
        `
          SELECT
            COUNT(*) AS open_pipeline_leads
          FROM ${schema.leadsTable} l
          WHERE l.status NOT IN ('CONVERTED', 'LOST')
        `,
      );

      const conversionRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
          FROM ${schema.leadsTable} l
          WHERE l.created_at >= (CURRENT_TIMESTAMP - INTERVAL 90 DAY)
        `,
      );

      const bookingRows = await queryRows(
        `
          SELECT
            AVG(COALESCE(b.total_amount, 0)) AS avg_booking_value
          FROM ${schema.bookingsTable} b
          WHERE b.created_at >= (CURRENT_TIMESTAMP - INTERVAL 90 DAY)
        `,
      );

      const seasonalityRows = await queryRows(
        `
          SELECT
            DATE_FORMAT(b.created_at, '%Y-%m') AS month,
            SUM(COALESCE(b.total_amount, 0)) AS revenue
          FROM ${schema.bookingsTable} b
          WHERE b.created_at >= (CURRENT_TIMESTAMP - INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
          ORDER BY DATE_FORMAT(b.created_at, '%Y-%m')
        `,
      );

      const openPipeline = toNumber(
        openPipelineRows[0]?.open_pipeline_leads,
        0,
      );
      const totalLeads = toNumber(conversionRows[0]?.total_leads, 0);
      const convertedLeads = toNumber(conversionRows[0]?.converted_leads, 0);
      const trailingConversionRate =
        totalLeads > 0 ? convertedLeads / totalLeads : 0;
      const avgBookingValue = toNumber(bookingRows[0]?.avg_booking_value, 0);

      const expectedConversions = Math.round(
        openPipeline * trailingConversionRate,
      );
      const expectedRevenue = Number(
        (expectedConversions * avgBookingValue).toFixed(2),
      );

      const now = new Date();
      const forecastByMonth = Array.from({ length: periodMonths }).map(
        (_, index) => {
          const monthDate = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + index + 1, 1),
          );
          const month = monthDate.toISOString().slice(0, 7);
          return {
            month,
            expectedConversions: Number(
              (expectedConversions / periodMonths).toFixed(2),
            ),
            expectedRevenue: Number(
              (expectedRevenue / periodMonths).toFixed(2),
            ),
          };
        },
      );

      return {
        trailingWindowDays: 90,
        openPipelineLeads: openPipeline,
        trailingLeads: totalLeads,
        trailingConvertedLeads: convertedLeads,
        trailingConversionRatePercent: Number(
          (trailingConversionRate * 100).toFixed(2),
        ),
        averageBookingValue: avgBookingValue,
        expectedConversions,
        expectedRevenue,
        forecastByMonth,
        seasonalTrend: seasonalityRows.map((row) => ({
          month: row.month,
          revenue: toNumber(row.revenue, 0),
        })),
      };
    },
  });
}

export { createReportsRepository };


