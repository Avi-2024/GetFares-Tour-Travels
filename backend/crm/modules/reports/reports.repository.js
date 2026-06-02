import { AppError } from "../../core/errors/index.js";
import { percentage, roundAmount } from "./reporting.metrics.js";

function createReportsRepository({ db, schema, logger }) {
  function getAdapterName() {
    return String(db.adapter || "").toLowerCase();
  }

  function canUseRawQuery() {
    const adapter = getAdapterName();
    return (
      typeof db.query === "function" &&
      (adapter === "mysql" || adapter === "mssql")
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

  function leadAssignmentScope(filters = {}, leadAlias = "l") {
    const clauses = [];
    const params = [];
    if (filters.userId) {
      clauses.push(`${leadAlias}.assigned_to = ?`);
      params.push(filters.userId);
    }
    if (filters.destination) {
      clauses.push(`LOWER(COALESCE(${leadAlias}.destination, '')) = LOWER(?)`);
      params.push(filters.destination);
    }
    if (filters.country) {
      clauses.push(
        `LOWER(TRIM(COALESCE(${leadAlias}.lead_country, ${leadAlias}.country, ''))) = LOWER(TRIM(?))`,
      );
      params.push(String(filters.country).trim());
    }
    if (filters.status && String(filters.status).trim().toUpperCase() !== "ALL") {
      clauses.push(`${leadAlias}.status = ?`);
      params.push(String(filters.status).trim().toUpperCase());
    }
    const src = String(filters.source || filters.leadSource || "").trim();
    if (src) {
      clauses.push(`COALESCE(${leadAlias}.source, 'UNKNOWN') = ?`);
      params.push(src);
    }
    return { clauses, params };
  }

  function leadWhereFromRange(range, filters = {}, leadAlias = "l") {
    const clauses = [];
    const params = [...range.params];
    if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
    const assign = leadAssignmentScope(filters, leadAlias);
    assign.clauses.forEach((c) => clauses.push(c));
    params.push(...assign.params);
    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  function bookingQuotWhereFromRange(range, filters = {}) {
    const clauses = [];
    const params = [...range.params];
    if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
    if (filters.userId) {
      clauses.push("q.created_by = ?");
      params.push(filters.userId);
    }
    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  /** Selling price for KPI/booking aggregates when total_amount was not back-filled. */
  function bookingSellAmountSql() {
    return `COALESCE(NULLIF(COALESCE(b.total_amount, 0), 0), COALESCE(q.final_price, 0), 0)`;
  }

  function appendWhereClause(whereSql, clause) {
    return whereSql ? `${whereSql} AND ${clause}` : `WHERE ${clause}`;
  }

  function scopedLeadWhere(columnName, filters = {}, leadAlias = "l") {
    const range = buildDateRangeClause(columnName, filters);
    return leadWhereFromRange(range, filters, leadAlias);
  }

  function scopedBookingLeadWhere(columnName, filters = {}) {
    const range = buildDateRangeClause(columnName, filters);
    return bookingLeadWhereFromRange(range, filters);
  }

  function scopedPaymentLeadWhere(columnName, filters = {}) {
    const range = buildDateRangeClause(columnName, filters);
    const clauses = [];
    const params = [...range.params];
    if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
    const assign = leadAssignmentScope(filters, "l");
    clauses.push(...assign.clauses);
    params.push(...assign.params);
    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  /** Optional: limit to bookings touching this supplier (visa case · quotation JSON · supplier_details). */
  function supplierBookingClause(filters = {}) {
    const idRaw = filters.supplierId && String(filters.supplierId).trim();
    const id = idRaw && idRaw.length ? idRaw : "";
    if (!id) {
      return { sql: "", params: [] };
    }
    const likePattern = `%"supplierId":"${id}"%`;
    return {
      sql: `(
          EXISTS (
            SELECT 1 FROM ${schema.visaCasesTable} vc_sup
            WHERE vc_sup.booking_id = b.id AND vc_sup.supplier_id = ?
          )
          OR COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(COALESCE(b.supplier_details, '{}'), '$.supplierId')),
            ''
          ) = ?
          OR COALESCE(
            JSON_UNQUOTE(JSON_EXTRACT(COALESCE(b.supplier_details, '{}'), '$.supplier_id')),
            ''
          ) = ?
          OR (q.template_snapshot IS NOT NULL AND q.template_snapshot LIKE ?)
        )`,
      params: [id, id, id, likePattern],
    };
  }

  /** Booking/report queries JOIN leads `l`; scope by assignee & lead attributes like /leads. */
  function bookingLeadWhereFromRange(range, filters = {}) {
    const clauses = [];
    const params = [...range.params];
    if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
    const assign = leadAssignmentScope(filters, "l");
    assign.clauses.forEach((c) => clauses.push(c));
    params.push(...assign.params);
    const sup = supplierBookingClause(filters);
    if (sup.sql) {
      clauses.push(sup.sql);
      params.push(...sup.params);
    }
    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  async function queryRows(sql, params = []) {
    if (!canUseRawQuery()) {
      throw new AppError(
        500,
        "Reports require a SQL database adapter with raw query support",
        "REPORTS_SQL_ADAPTER_UNSUPPORTED",
      );
    }
    try {
      const result = await db.query(sql, params);
      return result.rows;
    } catch (error) {
      logger?.error?.(
        {
          err: error,
          module: "reports",
          sqlPreview: String(sql || "").replace(/\s+/g, " ").trim().slice(0, 240),
        },
        "Reports raw SQL failed",
      );
      throw new AppError(
        500,
        "Unable to generate report",
        "REPORT_QUERY_FAILED",
        {
          reason: error.message,
        },
      );
    }
  }

  return Object.freeze({
    async getLeadsBySource(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const { sql: whereSql, params } = leadWhereFromRange(range, filters);
      const rows = await queryRows(
        `
          SELECT
            COALESCE(l.source, 'UNKNOWN') AS source,
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
          FROM ${schema.leadsTable} l
          ${whereSql}
          GROUP BY COALESCE(l.source, 'UNKNOWN')
          ORDER BY total_leads DESC
        `,
        params,
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
      const { sql: whereSql, params } = leadWhereFromRange(range, filters);

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

    async getPeoplePerformance(filters = {}) {
      const leadScope = scopedLeadWhere("l.created_at", filters, "l");
      const leadWhereSql = appendWhereClause(
        leadScope.sql,
        "l.assigned_to IS NOT NULL",
      );

      const quoteScope = scopedLeadWhere("q.created_at", filters, "l");
      const quoteWhereSql = appendWhereClause(
        quoteScope.sql,
        "l.assigned_to IS NOT NULL",
      );

      const bookingScope = scopedBookingLeadWhere("b.created_at", filters);
      const bookingWhereSql = appendWhereClause(
        bookingScope.sql,
        "l.assigned_to IS NOT NULL",
      );

      const paymentScope = scopedPaymentLeadWhere("p.created_at", filters);
      const paymentWhereSql = appendWhereClause(
        paymentScope.sql,
        "l.assigned_to IS NOT NULL",
      );

      const refundScope = scopedPaymentLeadWhere("r.created_at", filters);
      const refundWhereSql = appendWhereClause(
        refundScope.sql,
        "l.assigned_to IS NOT NULL",
      );

      const followupScope = scopedLeadWhere("f.created_at", filters, "l");
      const followupWhereSql = appendWhereClause(
        followupScope.sql,
        "COALESCE(f.user_id, l.assigned_to) IS NOT NULL",
      );

      const activityScope = scopedLeadWhere("a.created_at", filters, "l");
      const activityWhereSql = appendWhereClause(
        activityScope.sql,
        "COALESCE(a.user_id, l.assigned_to) IS NOT NULL",
      );

      const userClauses = ["COALESCE(u.is_active, TRUE) = TRUE"];
      const userParams = [];
      if (filters.userId) {
        userClauses.push("u.id = ?");
        userParams.push(filters.userId);
      }
      if (filters.role) {
        userClauses.push("LOWER(COALESCE(r.name, '')) = LOWER(?)");
        userParams.push(String(filters.role).trim());
      }
      const userWhereSql = `WHERE ${userClauses.join(" AND ")}`;
      const sell = bookingSellAmountSql();

      const rows = await queryRows(
        `
          SELECT
            u.id AS user_id,
            u.full_name AS full_name,
            u.email AS email,
            COALESCE(r.name, '') AS role_name,
            COALESCE(u.target_amount, 0) AS target_amount,
            COALESCE(lead_stats.assigned_leads, 0) AS assigned_leads,
            COALESCE(lead_stats.open_leads, 0) AS open_leads,
            COALESCE(lead_stats.converted_leads, 0) AS converted_leads,
            COALESCE(lead_stats.lost_leads, 0) AS lost_leads,
            COALESCE(lead_stats.stale_leads, 0) AS stale_leads,
            COALESCE(lead_stats.unworked_leads, 0) AS unworked_leads,
            COALESCE(lead_stats.sla_breached_leads, 0) AS sla_breached_leads,
            COALESCE(lead_stats.avg_first_response_minutes, 0) AS avg_first_response_minutes,
            COALESCE(quote_stats.quotations_created, 0) AS quotations_created,
            COALESCE(quote_stats.quotations_sent, 0) AS quotations_sent,
            COALESCE(quote_stats.quotations_approved, 0) AS quotations_approved,
            COALESCE(quote_stats.quotation_value, 0) AS quotation_value,
            COALESCE(booking_stats.bookings, 0) AS bookings,
            COALESCE(booking_stats.cancelled_bookings, 0) AS cancelled_bookings,
            COALESCE(booking_stats.booking_value, 0) AS booking_value,
            COALESCE(booking_stats.booking_cost, 0) AS booking_cost,
            COALESCE(payment_stats.payments_received, 0) AS payments_received,
            COALESCE(payment_stats.collected_amount, 0) AS collected_amount,
            COALESCE(refund_stats.refunds, 0) AS refunds,
            COALESCE(refund_stats.refund_amount, 0) AS refund_amount,
            COALESCE(followup_stats.followups_created, 0) AS followups_created,
            COALESCE(followup_stats.followups_completed, 0) AS followups_completed,
            COALESCE(followup_stats.missed_followups, 0) AS missed_followups,
            COALESCE(followup_stats.calls_done, 0) AS calls_done,
            COALESCE(followup_stats.whatsapp_done, 0) AS whatsapp_done,
            COALESCE(followup_stats.final_reminders_done, 0) AS final_reminders_done,
            COALESCE(activity_stats.activities_logged, 0) AS activities_logged
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.rolesTable} r ON r.id = u.role_id
          LEFT JOIN (
            SELECT
              l.assigned_to AS user_id,
              COUNT(*) AS assigned_leads,
              SUM(CASE WHEN l.status NOT IN ('CONVERTED', 'LOST') THEN 1 ELSE 0 END) AS open_leads,
              SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads,
              SUM(CASE WHEN l.status = 'LOST' THEN 1 ELSE 0 END) AS lost_leads,
              SUM(CASE WHEN l.status NOT IN ('CONVERTED', 'LOST') AND l.created_at < (CURRENT_TIMESTAMP - INTERVAL 48 HOUR) THEN 1 ELSE 0 END) AS stale_leads,
              SUM(CASE WHEN l.status = 'OPEN' AND l.response_at IS NULL AND l.next_followup_date IS NULL THEN 1 ELSE 0 END) AS unworked_leads,
              SUM(CASE WHEN COALESCE(l.sla_breached, FALSE) = TRUE THEN 1 ELSE 0 END) AS sla_breached_leads,
              AVG(
                CASE
                  WHEN l.response_at IS NOT NULL AND l.created_at IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, l.created_at, l.response_at)
                  ELSE NULL
                END
              ) AS avg_first_response_minutes
            FROM ${schema.leadsTable} l
            ${leadWhereSql}
            GROUP BY l.assigned_to
          ) lead_stats ON lead_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              l.assigned_to AS user_id,
              COUNT(q.id) AS quotations_created,
              SUM(CASE WHEN q.status IN ('SENT', 'APPROVED') OR q.sent_at IS NOT NULL THEN 1 ELSE 0 END) AS quotations_sent,
              SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END) AS quotations_approved,
              SUM(COALESCE(NULLIF(q.total_sale_value, 0), q.final_price, 0)) AS quotation_value
            FROM ${schema.quotationsTable} q
            INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${quoteWhereSql}
            GROUP BY l.assigned_to
          ) quote_stats ON quote_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              l.assigned_to AS user_id,
              COUNT(b.id) AS bookings,
              SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
              SUM(${sell}) AS booking_value,
              SUM(COALESCE(b.cost_amount, 0)) AS booking_cost
            FROM ${schema.bookingsTable} b
            INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${bookingWhereSql}
            GROUP BY l.assigned_to
          ) booking_stats ON booking_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              l.assigned_to AS user_id,
              COUNT(p.id) AS payments_received,
              SUM(CASE WHEN COALESCE(p.status, '') <> 'REFUNDED' THEN COALESCE(p.amount, 0) ELSE 0 END) AS collected_amount
            FROM ${schema.paymentsTable} p
            INNER JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
            INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${paymentWhereSql}
            GROUP BY l.assigned_to
          ) payment_stats ON payment_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              l.assigned_to AS user_id,
              COUNT(r.id) AS refunds,
              SUM(COALESCE(r.refund_amount, 0)) AS refund_amount
            FROM ${schema.refundsTable} r
            INNER JOIN ${schema.bookingsTable} b ON b.id = r.booking_id
            INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${refundWhereSql}
            GROUP BY l.assigned_to
          ) refund_stats ON refund_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              COALESCE(f.user_id, l.assigned_to) AS user_id,
              COUNT(f.id) AS followups_created,
              SUM(CASE WHEN COALESCE(f.is_completed, FALSE) = TRUE THEN 1 ELSE 0 END) AS followups_completed,
              SUM(CASE WHEN COALESCE(f.is_completed, FALSE) = FALSE AND f.followup_date < CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS missed_followups,
              SUM(CASE WHEN f.followup_type = 'CALL' THEN 1 ELSE 0 END) AS calls_done,
              SUM(CASE WHEN f.followup_type = 'WHATSAPP' THEN 1 ELSE 0 END) AS whatsapp_done,
              SUM(CASE WHEN f.followup_type = 'FINAL_REMINDER' THEN 1 ELSE 0 END) AS final_reminders_done
            FROM ${schema.followupsTable} f
            INNER JOIN ${schema.leadsTable} l ON l.id = f.lead_id
            ${followupWhereSql}
            GROUP BY COALESCE(f.user_id, l.assigned_to)
          ) followup_stats ON followup_stats.user_id = u.id
          LEFT JOIN (
            SELECT
              COALESCE(a.user_id, l.assigned_to) AS user_id,
              COUNT(a.id) AS activities_logged
            FROM ${schema.leadActivitiesTable} a
            INNER JOIN ${schema.leadsTable} l ON l.id = a.lead_id
            ${activityWhereSql}
            GROUP BY COALESCE(a.user_id, l.assigned_to)
          ) activity_stats ON activity_stats.user_id = u.id
          ${userWhereSql}
          ORDER BY COALESCE(booking_stats.booking_value, 0) DESC,
                   COALESCE(lead_stats.converted_leads, 0) DESC,
                   COALESCE(lead_stats.assigned_leads, 0) DESC
        `,
        [
          ...leadScope.params,
          ...quoteScope.params,
          ...bookingScope.params,
          ...paymentScope.params,
          ...refundScope.params,
          ...followupScope.params,
          ...activityScope.params,
          ...userParams,
        ],
      );

      return rows.map((row) => {
        const assignedLeads = toNumber(row.assigned_leads, 0);
        const convertedLeads = toNumber(row.converted_leads, 0);
        const quotationsCreated = toNumber(row.quotations_created, 0);
        const quotationsApproved = toNumber(row.quotations_approved, 0);
        const bookings = toNumber(row.bookings, 0);
        const bookingValue = toNumber(row.booking_value, 0);
        const bookingCost = toNumber(row.booking_cost, 0);
        const collectedAmount = toNumber(row.collected_amount, 0);
        const refundAmount = toNumber(row.refund_amount, 0);
        const followupsCreated = toNumber(row.followups_created, 0);
        const followupsCompleted = toNumber(row.followups_completed, 0);
        const profit = roundAmount(bookingValue - bookingCost - refundAmount);

        return {
          userId: row.user_id,
          name: row.full_name,
          email: row.email,
          role: row.role_name || null,
          targetAmount: toNumber(row.target_amount, 0),
          assignedLeads,
          openLeads: toNumber(row.open_leads, 0),
          convertedLeads,
          lostLeads: toNumber(row.lost_leads, 0),
          staleLeads: toNumber(row.stale_leads, 0),
          unworkedLeads: toNumber(row.unworked_leads, 0),
          slaBreachedLeads: toNumber(row.sla_breached_leads, 0),
          conversionRatePercent: percentage(convertedLeads, assignedLeads),
          averageFirstResponseMinutes: Number(
            toNumber(row.avg_first_response_minutes, 0).toFixed(2),
          ),
          quotationsCreated,
          quotationsSent: toNumber(row.quotations_sent, 0),
          quotationsApproved,
          quotationApprovalRatePercent: percentage(
            quotationsApproved,
            quotationsCreated,
          ),
          quotationValue: toNumber(row.quotation_value, 0),
          bookings,
          cancelledBookings: toNumber(row.cancelled_bookings, 0),
          bookingConversionRatePercent: percentage(bookings, assignedLeads),
          bookingValue,
          averageBookingValue:
            bookings > 0 ? Number((bookingValue / bookings).toFixed(2)) : 0,
          bookingCost,
          collectedAmount,
          outstandingAmount: Number(
            Math.max(bookingValue - collectedAmount - refundAmount, 0).toFixed(2),
          ),
          paymentsReceived: toNumber(row.payments_received, 0),
          refunds: toNumber(row.refunds, 0),
          refundAmount,
          profit,
          averageMarginPercent:
            bookingValue > 0
              ? Number(((profit / bookingValue) * 100).toFixed(2))
              : 0,
          followupsCreated,
          followupsCompleted,
          missedFollowups: toNumber(row.missed_followups, 0),
          followupCompletionRatePercent: percentage(
            followupsCompleted,
            followupsCreated,
          ),
          callsDone: toNumber(row.calls_done, 0),
          whatsappDone: toNumber(row.whatsapp_done, 0),
          finalRemindersDone: toNumber(row.final_reminders_done, 0),
          activitiesLogged: toNumber(row.activities_logged, 0),
        };
      });
    },

    async getQuotationPerformance(filters = {}) {
      const range = buildDateRangeClause("q.created_at", filters);
      const { sql: scopedWhereSql, params } = leadWhereFromRange(
        range,
        filters,
        "l",
      );
      const quotedParams = [...params];
      const sell = "COALESCE(NULLIF(q.total_sale_value, 0), q.final_price, 0)";

      const rows = await queryRows(
        `
          SELECT
            COUNT(q.id) AS total_quotations,
            SUM(CASE WHEN q.status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_quotations,
            SUM(CASE WHEN q.status = 'SENT' OR q.sent_at IS NOT NULL THEN 1 ELSE 0 END) AS sent_quotations,
            SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_quotations,
            SUM(CASE WHEN q.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_quotations,
            SUM(CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END) AS booked_quotations,
            SUM(${sell}) AS quotation_value,
            AVG(
              CASE
                WHEN q.created_at IS NOT NULL AND l.created_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, l.created_at, q.created_at)
                ELSE NULL
              END
            ) AS avg_lead_to_quote_minutes,
            AVG(
              CASE
                WHEN q.sent_at IS NOT NULL AND q.created_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, q.created_at, q.sent_at)
                ELSE NULL
              END
            ) AS avg_quote_to_send_minutes
          FROM ${schema.quotationsTable} q
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          LEFT JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          ${scopedWhereSql}
        `,
        quotedParams,
      );

      const destinationRows = await queryRows(
        `
          SELECT
            COALESCE(d.name, l.destination, 'UNKNOWN') AS destination,
            COUNT(q.id) AS quotations,
            SUM(CASE WHEN q.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
            SUM(CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END) AS bookings,
            SUM(${sell}) AS value
          FROM ${schema.quotationsTable} q
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
          LEFT JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          ${scopedWhereSql}
          GROUP BY COALESCE(d.name, l.destination, 'UNKNOWN')
          ORDER BY value DESC
          LIMIT 25
        `,
        quotedParams,
      );

      const statusRows = await queryRows(
        `
          SELECT
            COALESCE(q.status, 'UNKNOWN') AS status,
            COUNT(q.id) AS total,
            SUM(${sell}) AS value
          FROM ${schema.quotationsTable} q
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${scopedWhereSql}
          GROUP BY COALESCE(q.status, 'UNKNOWN')
          ORDER BY total DESC
        `,
        quotedParams,
      );

      const row = rows[0] || {};
      const total = toNumber(row.total_quotations, 0);
      const approved = toNumber(row.approved_quotations, 0);
      const booked = toNumber(row.booked_quotations, 0);

      return {
        summary: {
          totalQuotations: total,
          draftQuotations: toNumber(row.draft_quotations, 0),
          sentQuotations: toNumber(row.sent_quotations, 0),
          approvedQuotations: approved,
          rejectedQuotations: toNumber(row.rejected_quotations, 0),
          bookedQuotations: booked,
          quotationValue: toNumber(row.quotation_value, 0),
          approvalRatePercent: percentage(approved, total),
          bookingRatePercent: percentage(booked, total),
          averageLeadToQuoteMinutes: Number(
            toNumber(row.avg_lead_to_quote_minutes, 0).toFixed(2),
          ),
          averageQuoteToSendMinutes: Number(
            toNumber(row.avg_quote_to_send_minutes, 0).toFixed(2),
          ),
        },
        byDestination: destinationRows.map((item) => {
          const quotations = toNumber(item.quotations, 0);
          const itemApproved = toNumber(item.approved, 0);
          return {
            destination: item.destination,
            quotations,
            approved: itemApproved,
            bookings: toNumber(item.bookings, 0),
            value: toNumber(item.value, 0),
            approvalRatePercent: percentage(itemApproved, quotations),
          };
        }),
        byStatus: statusRows.map((item) => ({
          status: item.status,
          total: toNumber(item.total, 0),
          value: toNumber(item.value, 0),
        })),
      };
    },

    async getBookingPerformance(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const { sql: whereSql, params } = bookingLeadWhereFromRange(range, filters);
      const sell = bookingSellAmountSql();

      const rows = await queryRows(
        `
          SELECT
            COUNT(b.id) AS total_bookings,
            SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_bookings,
            SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_bookings,
            SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
            SUM(${sell}) AS booking_value,
            SUM(COALESCE(b.cost_amount, 0)) AS booking_cost,
            SUM(COALESCE(b.advance_received, 0)) AS advance_received,
            AVG(${sell}) AS avg_booking_value
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${whereSql}
        `,
        params,
      );

      const monthRows = await queryRows(
        `
          SELECT
            DATE_FORMAT(b.created_at, '%Y-%m') AS month,
            COUNT(b.id) AS bookings,
            SUM(${sell}) AS value,
            SUM(COALESCE(b.cost_amount, 0)) AS cost
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${whereSql}
          GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
          ORDER BY month
        `,
        params,
      );

      const destinationRows = await queryRows(
        `
          SELECT
            COALESCE(d.name, l.destination, 'UNKNOWN') AS destination,
            COUNT(b.id) AS bookings,
            SUM(${sell}) AS value,
            SUM(COALESCE(b.cost_amount, 0)) AS cost
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
          ${whereSql}
          GROUP BY COALESCE(d.name, l.destination, 'UNKNOWN')
          ORDER BY value DESC
          LIMIT 25
        `,
        params,
      );

      const row = rows[0] || {};
      const total = toNumber(row.total_bookings, 0);
      const cancelled = toNumber(row.cancelled_bookings, 0);
      const value = toNumber(row.booking_value, 0);
      const cost = toNumber(row.booking_cost, 0);
      const profit = roundAmount(value - cost);

      return {
        summary: {
          totalBookings: total,
          confirmedBookings: toNumber(row.confirmed_bookings, 0),
          pendingBookings: toNumber(row.pending_bookings, 0),
          cancelledBookings: cancelled,
          bookingValue: value,
          bookingCost: cost,
          profit,
          advanceReceived: toNumber(row.advance_received, 0),
          averageBookingValue: toNumber(row.avg_booking_value, 0),
          cancellationRatePercent: percentage(cancelled, total),
          marginPercent: percentage(profit, value),
        },
        byMonth: monthRows.map((item) => {
          const monthValue = toNumber(item.value, 0);
          const monthCost = toNumber(item.cost, 0);
          const monthProfit = roundAmount(monthValue - monthCost);
          return {
            month: item.month,
            bookings: toNumber(item.bookings, 0),
            value: monthValue,
            cost: monthCost,
            profit: monthProfit,
          };
        }),
        byDestination: destinationRows.map((item) => {
          const destValue = toNumber(item.value, 0);
          const destCost = toNumber(item.cost, 0);
          return {
            destination: item.destination,
            bookings: toNumber(item.bookings, 0),
            value: destValue,
            cost: destCost,
            profit: roundAmount(destValue - destCost),
          };
        }),
      };
    },

    async getFinanceSummary(filters = {}) {
      const bookingRange = buildDateRangeClause("b.created_at", filters);
      const { sql: bookingWhereSql, params: bookingParams } =
        bookingLeadWhereFromRange(bookingRange, filters);
      const paymentScope = scopedPaymentLeadWhere("p.created_at", filters);
      const refundScope = scopedPaymentLeadWhere("r.created_at", filters);
      const sell = bookingSellAmountSql();

      const bookingRows = await queryRows(
        `
          SELECT
            COUNT(b.id) AS total_bookings,
            SUM(${sell}) AS booked_amount,
            SUM(COALESCE(b.cost_amount, 0)) AS cost_amount,
            SUM(CASE WHEN b.payment_status IN ('PENDING', 'PARTIAL') THEN ${sell} - COALESCE(b.advance_received, 0) ELSE 0 END) AS booking_outstanding
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${bookingWhereSql}
        `,
        bookingParams,
      );

      const paymentRows = await queryRows(
        `
          SELECT
            COUNT(p.id) AS payments,
            SUM(CASE WHEN COALESCE(p.status, '') <> 'REFUNDED' THEN COALESCE(p.amount, 0) ELSE 0 END) AS collected_amount,
            SUM(CASE WHEN COALESCE(p.is_verified, FALSE) = FALSE THEN COALESCE(p.amount, 0) ELSE 0 END) AS unverified_amount
          FROM ${schema.paymentsTable} p
          INNER JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
          INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${paymentScope.sql}
        `,
        paymentScope.params,
      );

      const refundRows = await queryRows(
        `
          SELECT
            COUNT(r.id) AS refunds,
            SUM(COALESCE(r.refund_amount, 0)) AS refund_amount,
            SUM(CASE WHEN r.status <> 'PROCESSED' THEN COALESCE(r.refund_amount, 0) ELSE 0 END) AS pending_refund_amount
          FROM ${schema.refundsTable} r
          INNER JOIN ${schema.bookingsTable} b ON b.id = r.booking_id
          INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${refundScope.sql}
        `,
        refundScope.params,
      );

      const modeRows = await queryRows(
        `
          SELECT
            COALESCE(p.payment_mode, 'UNKNOWN') AS payment_mode,
            COUNT(p.id) AS payments,
            SUM(COALESCE(p.amount, 0)) AS amount
          FROM ${schema.paymentsTable} p
          INNER JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
          INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          INNER JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${paymentScope.sql}
          GROUP BY COALESCE(p.payment_mode, 'UNKNOWN')
          ORDER BY amount DESC
        `,
        paymentScope.params,
      );

      const booking = bookingRows[0] || {};
      const payment = paymentRows[0] || {};
      const refund = refundRows[0] || {};
      const bookedAmount = toNumber(booking.booked_amount, 0);
      const costAmount = toNumber(booking.cost_amount, 0);
      const collectedAmount = toNumber(payment.collected_amount, 0);
      const refundAmount = toNumber(refund.refund_amount, 0);
      const profit = roundAmount(bookedAmount - costAmount - refundAmount);

      return {
        summary: {
          totalBookings: toNumber(booking.total_bookings, 0),
          bookedAmount,
          costAmount,
          collectedAmount,
          outstandingAmount: Number(
            Math.max(bookedAmount - collectedAmount - refundAmount, 0).toFixed(2),
          ),
          bookingOutstandingAmount: toNumber(booking.booking_outstanding, 0),
          unverifiedAmount: toNumber(payment.unverified_amount, 0),
          refunds: toNumber(refund.refunds, 0),
          refundAmount,
          pendingRefundAmount: toNumber(refund.pending_refund_amount, 0),
          profit,
          marginPercent: percentage(profit, bookedAmount),
          collectionRatePercent: percentage(collectedAmount, bookedAmount),
        },
        byPaymentMode: modeRows.map((item) => ({
          paymentMode: item.payment_mode,
          payments: toNumber(item.payments, 0),
          amount: toNumber(item.amount, 0),
        })),
      };
    },

    async getOperationsPerformance(filters = {}) {
      const followupScope = scopedLeadWhere("f.created_at", filters, "l");
      const complaintRange = buildDateRangeClause("c.created_at", filters);
      const complaintWhere = bookingLeadWhereFromRange(complaintRange, filters);
      const visaRange = buildDateRangeClause("vc.created_at", filters);
      const visaWhere = bookingLeadWhereFromRange(visaRange, filters);

      const followupRows = await queryRows(
        `
          SELECT
            COUNT(f.id) AS total_followups,
            SUM(CASE WHEN COALESCE(f.is_completed, FALSE) = TRUE THEN 1 ELSE 0 END) AS completed_followups,
            SUM(CASE WHEN COALESCE(f.is_completed, FALSE) = FALSE AND f.followup_date < CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS missed_followups,
            SUM(CASE WHEN COALESCE(f.is_completed, FALSE) = FALSE AND f.followup_date >= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS upcoming_followups
          FROM ${schema.followupsTable} f
          INNER JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          ${followupScope.sql}
        `,
        followupScope.params,
      );

      const complaintRows = await queryRows(
        `
          SELECT
            COUNT(c.id) AS total_complaints,
            SUM(CASE WHEN c.status = 'OPEN' THEN 1 ELSE 0 END) AS open_complaints,
            SUM(CASE WHEN c.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_complaints,
            SUM(CASE WHEN c.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_complaints
          FROM ${schema.complaintsTable} c
          LEFT JOIN ${schema.bookingsTable} b ON b.id = c.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${complaintWhere.sql}
        `,
        complaintWhere.params,
      );

      const visaRows = await queryRows(
        `
          SELECT
            COUNT(vc.id) AS total_visa_cases,
            SUM(CASE WHEN vc.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_visa_cases,
            SUM(CASE WHEN vc.status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_visa_cases,
            SUM(CASE WHEN vc.status = 'DOCUMENT_PENDING' THEN 1 ELSE 0 END) AS document_pending_cases,
            SUM(CASE WHEN vc.status = 'SUBMITTED' THEN 1 ELSE 0 END) AS submitted_cases
          FROM ${schema.visaCasesTable} vc
          LEFT JOIN ${schema.bookingsTable} b ON b.id = vc.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${visaWhere.sql}
        `,
        visaWhere.params,
      );

      const followups = followupRows[0] || {};
      const complaints = complaintRows[0] || {};
      const visa = visaRows[0] || {};
      const totalFollowups = toNumber(followups.total_followups, 0);
      const completedFollowups = toNumber(followups.completed_followups, 0);
      const totalComplaints = toNumber(complaints.total_complaints, 0);
      const resolvedComplaints = toNumber(complaints.resolved_complaints, 0);
      const totalVisaCases = toNumber(visa.total_visa_cases, 0);
      const approvedVisaCases = toNumber(visa.approved_visa_cases, 0);

      return {
        followups: {
          totalFollowups,
          completedFollowups,
          missedFollowups: toNumber(followups.missed_followups, 0),
          upcomingFollowups: toNumber(followups.upcoming_followups, 0),
          completionRatePercent: percentage(completedFollowups, totalFollowups),
        },
        complaints: {
          totalComplaints,
          openComplaints: toNumber(complaints.open_complaints, 0),
          inProgressComplaints: toNumber(complaints.in_progress_complaints, 0),
          resolvedComplaints,
          resolutionRatePercent: percentage(resolvedComplaints, totalComplaints),
        },
        visa: {
          totalVisaCases,
          approvedVisaCases,
          rejectedVisaCases: toNumber(visa.rejected_visa_cases, 0),
          documentPendingCases: toNumber(visa.document_pending_cases, 0),
          submittedCases: toNumber(visa.submitted_cases, 0),
          approvalRatePercent: percentage(approvedVisaCases, totalVisaCases),
        },
      };
    },

    async getDealLinesReport(filters = {}) {
      const bookingRange = buildDateRangeClause("b.created_at", filters);
      const bookingWhereInner = bookingRange.sql ?
        bookingRange.sql.replace(/^WHERE\s+/i, "")
        : "";
      const bookingWhereSql =
        bookingWhereInner ? `WHERE ${bookingWhereInner}` : "";

      const leadRange = buildDateRangeClause("l.created_at", filters);
      const { sql: leadWhereSql, params: leadParams } = leadWhereFromRange(
        leadRange,
        filters,
      );

      const limit = Math.min(Math.max(toNumber(filters.limit, 800), 1), 2500);

      const rows = await queryRows(
        `
          SELECT
            l.id AS lead_id,
            l.created_at AS lead_date,
            l.full_name AS lead_name,
            COALESCE(l.source, 'UNKNOWN') AS source,
            l.status AS status,
            COALESCE(l.sub_status, '') AS sub_status,
            COALESCE(u.full_name, '') AS assigned_user,
            COALESCE(deal_agg.deal_amount, 0) AS deal_amount,
            COALESCE(deal_agg.booking_count, 0) AS booking_count
          FROM ${schema.leadsTable} l
          LEFT JOIN ${schema.usersTable} u ON u.id = l.assigned_to
          LEFT JOIN (
            SELECT
              q.lead_id AS lead_ref,
              COUNT(b.id) AS booking_count,
              SUM(COALESCE(b.total_amount, 0)) AS deal_amount
            FROM ${schema.bookingsTable} b
            INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            ${bookingWhereSql}
            GROUP BY q.lead_id
          ) deal_agg ON deal_agg.lead_ref = l.id
          ${leadWhereSql}
          ORDER BY l.created_at DESC
          LIMIT ?
        `,
        [...bookingRange.params, ...leadParams, limit],
      );

      return rows.map((row) => ({
        leadId: row.lead_id,
        leadDate: row.lead_date,
        leadName: row.lead_name,
        source: row.source,
        status: row.status,
        subStatus: row.sub_status,
        assignedUser: row.assigned_user,
        dealAmount: toNumber(row.deal_amount, 0),
        bookingCount: toNumber(row.booking_count, 0),
      }));
    },

    async getLeadAgingReport(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const { sql: whereSql, params } = leadWhereFromRange(range, filters);
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
          ${whereSql}
          ORDER BY l.created_at ASC
        `,
        params,
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
      const clauses = ["l.status = 'LOST'"];
      const params = [...range.params];
      if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
      if (filters.userId) {
        clauses.push("l.assigned_to = ?");
        params.push(filters.userId);
      }
      const rows = await queryRows(
        `
          SELECT
            l.id,
            l.full_name,
            l.source,
            l.closed_reason,
            l.updated_at AS lost_at
          FROM ${schema.leadsTable} l
          WHERE ${clauses.join(" AND ")}
          ORDER BY l.updated_at DESC
        `,
        params,
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
      const { sql: whereSql, params } = bookingLeadWhereFromRange(range, filters);
      const sell = bookingSellAmountSql();
      const rows = await queryRows(
        `
          SELECT
            DATE_FORMAT(b.created_at, '%Y-%m') AS month,
            SUM(${sell}) AS revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS cost,
            SUM((${sell}) - COALESCE(b.cost_amount, 0)) AS profit
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${whereSql}
          GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
          ORDER BY DATE_FORMAT(b.created_at, '%Y-%m')
        `,
        params,
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
      const { sql: whereSql, params } = bookingLeadWhereFromRange(range, filters);
      const sell = bookingSellAmountSql();
      const rows = await queryRows(
        `
          WITH base AS (
            SELECT
              b.id AS booking_id,
              ${sell} AS sell_amount,
              CASE
                WHEN COALESCE(l.lead_type, 'HOLIDAY') = 'VISA' THEN 'VISA'
                ELSE 'HOLIDAY'
              END AS service_type
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${whereSql}
          )
          SELECT
            service_type,
            COUNT(*) AS total_bookings,
            SUM(COALESCE(sell_amount, 0)) AS revenue
          FROM base
          GROUP BY service_type
          ORDER BY revenue DESC
        `,
        params,
      );

      return rows.map((row) => ({
        serviceType: row.service_type,
        totalBookings: toNumber(row.total_bookings, 0),
        revenue: toNumber(row.revenue, 0),
      }));
    },

    async getRevenueByDestination(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const { sql: scopedWhereSql, params } = bookingLeadWhereFromRange(range, filters);
      const clauses = scopedWhereSql
        ? [scopedWhereSql.replace(/^WHERE\s+/i, "")]
        : [];
      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const sell = bookingSellAmountSql();
      const rows = await queryRows(
        `
          SELECT
            COALESCE(d.name, 'UNKNOWN') AS destination,
            COUNT(*) AS total_bookings,
            SUM(${sell}) AS revenue
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          LEFT JOIN ${schema.destinationsTable} d ON d.id = l.destination_id
          ${whereSql}
          GROUP BY COALESCE(d.name, 'UNKNOWN')
          ORDER BY revenue DESC
        `,
        params,
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
      const { sql: whereSql, params } = bookingQuotWhereFromRange(range, filters);
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
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          ${whereSql}
          ORDER BY outstanding_amount DESC
        `,
        params,
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
      const clauses = [];
      const params = [...range.params];
      if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
      if (filters.userId) {
        clauses.push("q.created_by = ?");
        params.push(filters.userId);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = await queryRows(
        `
          SELECT
            p.payment_mode,
            COUNT(*) AS total_payments,
            SUM(COALESCE(p.amount, 0)) AS total_amount
          FROM ${schema.paymentsTable} p
          INNER JOIN ${schema.bookingsTable} b ON b.id = p.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          ${whereSql}
          GROUP BY p.payment_mode
          ORDER BY total_amount DESC
        `,
        params,
      );

      return rows.map((row) => ({
        paymentMode: row.payment_mode,
        totalPayments: toNumber(row.total_payments, 0),
        totalAmount: toNumber(row.total_amount, 0),
      }));
    },

    async getProfitMarginReport(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const { sql: whereSql, params } = bookingQuotWhereFromRange(range, filters);
      const rows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_bookings,
            SUM(COALESCE(b.total_amount, 0)) AS total_revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS total_cost,
            SUM(COALESCE(b.total_amount, 0) - COALESCE(b.cost_amount, 0)) AS total_profit
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          ${whereSql}
        `,
        params,
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
      if (filters.userId) {
        params.push(filters.userId);
        where.push(`q.created_by = ?`);
      }
      if (filters.currency) {
        const currency = String(filters.currency).trim().toUpperCase();
        params.push(currency, currency, currency);
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
          LIMIT ?
          OFFSET ?
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
      const limit = Math.min(Math.max(toNumber(filters.limit, 20), 1), 2000);
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
      const assignSup = leadAssignmentScope(filters, "l");
      assignSup.clauses.forEach((c) => where.push(c));
      params.push(...assignSup.params);

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
            COALESCE(b.advance_received, 0) AS advance_received,
            COALESCE(b.total_amount, 0) AS booking_total_amount,
            COALESCE(b.cost_amount, 0) AS booking_cost_amount,
            COALESCE(
              NULLIF(TRIM(q.client_currency), ''),
              NULLIF(TRIM(q.cost_currency), ''),
              NULLIF(TRIM(q.supplier_currency), ''),
              'INR'
            ) AS booking_client_currency
          FROM ${schema.quotationsTable} q
          INNER JOIN ${schema.bookingsTable} b ON b.quotation_id = q.id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${whereSql}
            AND UPPER(COALESCE(NULLIF(TRIM(b.status), ''), '')) <> 'CANCELLED'
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
        const customerName =
          normalizeText(snapshot.customerName) ||
          normalizeText(snapshot.customer_name) ||
          normalizeText(snapshot?.lead?.fullName) ||
          normalizeText(snapshot?.lead?.full_name) ||
          normalizeText(snapshot?.lead?.name) ||
          leadName;
        const destination =
          normalizeText(snapshot.destination) ||
          normalizeText(snapshot.tripDestination) ||
          normalizeText(snapshot.trip_destination) ||
          "N/A";
        const bookingTotalAmount = toNumber(row.booking_total_amount, 0);
        const bookingCostAmount = toNumber(row.booking_cost_amount, 0);
        const bookingCurrency =
          normalizeText(row.booking_client_currency) || currency;

        const pushFinanceRow = (service, index, options = {}) => {
          const synthetic = Boolean(options.synthetic);
          const supplierId =
            normalizeText(service?.supplierId) ||
            normalizeText(supplierDetails?.supplierId) ||
            "UNASSIGNED";
          if (filters.supplierId && String(filters.supplierId).trim() !== supplierId) {
            return;
          }
          const baseFromService = toNumber(service?.baseCost, 0);
          const basePrice = synthetic
            ? (bookingCostAmount > 0
                ? bookingCostAmount
                : bookingTotalAmount)
            : baseFromService;

          allRows.push({
            id: `${row.quotation_id}-${index}${synthetic ? "-syn" : ""}`,
            quotationId: row.quotation_id,
            bookingId: row.booking_id,
            bookingNumber: row.booking_number,
            bookingStatus: row.booking_status,
            paymentStatus: row.payment_status,
            advanceReceived: toNumber(row.advance_received, 0),
            quoteNumber,
            leadName,
            customerName,
            destination,
            bookingTotalAmount,
            bookingCurrency,
            serviceLabel: synthetic
              ? "Package / quotation (no line items in snapshot)"
              : deriveServiceLabel(service),
            supplierId,
            supplierName:
              normalizeText(service?.supplierName) ||
              normalizeText(supplierDetails?.supplierName) ||
              "Not selected",
            basePrice,
            currency,
            quotationStatus: row.quotation_status,
            createdAt: row.created_at,
          });
        };

        if (!serviceRows.length) {
          pushFinanceRow({ baseCost: 0, supplierId: supplierDetails?.supplierId }, 0, {
            synthetic: true,
          });
        } else {
          serviceRows.forEach((service, index) => {
            pushFinanceRow(service, index);
          });
        }
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
      const clauses = [];
      const params = [...range.params];
      if (range.sql) clauses.push(range.sql.replace(/^WHERE\s+/i, ""));
      if (filters.userId) {
        clauses.push("q.created_by = ?");
        params.push(filters.userId);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const scopeJoinSql = filters.userId ?
        `
          INNER JOIN ${schema.bookingsTable} b ON b.id = vc.booking_id
          INNER JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
        `
      : "";

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
          ${scopeJoinSql}
          ${whereSql}
        `,
        params,
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
      const params = [date];
      let extra = "";
      if (filters.userId) {
        extra = " AND l.assigned_to = ?";
        params.push(filters.userId);
      }
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
          INNER JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          WHERE DATE(f.followup_date) = ?
          ${extra}
          ORDER BY f.followup_date ASC
        `,
        params,
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
      const params = [date];
      let extra = "";
      if (filters.userId) {
        extra = " AND l.assigned_to = ?";
        params.push(filters.userId);
      }
      const rows = await queryRows(
        `
          SELECT
            f.id,
            f.lead_id,
            l.full_name,
            f.followup_type,
            f.followup_date
          FROM ${schema.followupsTable} f
          INNER JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          WHERE DATE(f.followup_date) < ?
            AND COALESCE(f.is_completed, FALSE) = FALSE
          ${extra}
          ORDER BY f.followup_date ASC
        `,
        params,
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

      const assignLog = leadAssignmentScope(filters, "l");
      assignLog.clauses.forEach((c) => where.push(c));
      params.push(...assignLog.params);

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
          INNER JOIN ${schema.leadsTable} l ON l.id = la.lead_id
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

    /** Non-call lead activities + volume by type (emails, notes, meetings, etc.). */
    async getLeadActivityFeed(filters = {}) {
      const params = [];
      const where = [
        `NOT (UPPER(TRIM(COALESCE(la.activity_type, ''))) LIKE 'CALL%')`,
      ];

      if (filters.from) {
        params.push(filters.from);
        where.push(`la.created_at >= ?`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`la.created_at <= ?`);
      }

      const assignLog = leadAssignmentScope(filters, "l");
      assignLog.clauses.forEach((c) => where.push(c));
      params.push(...assignLog.params);

      const whereSql = `WHERE ${where.join(" AND ")}`;
      const limit = Math.min(Math.max(toNumber(filters.limit, 250), 1), 500);

      const typeRows = await queryRows(
        `
          SELECT
            COALESCE(NULLIF(TRIM(la.activity_type), ''), 'UNKNOWN') AS activity_type,
            COUNT(*) AS total
          FROM ${schema.leadActivitiesTable} la
          INNER JOIN ${schema.leadsTable} l ON l.id = la.lead_id
          ${whereSql}
          GROUP BY COALESCE(NULLIF(TRIM(la.activity_type), ''), 'UNKNOWN')
          ORDER BY total DESC
        `,
        params,
      );

      const listRows = await queryRows(
        `
          SELECT
            la.id,
            la.lead_id,
            la.user_id,
            la.activity_type,
            la.notes,
            la.created_at,
            u.full_name AS consultant_name,
            l.full_name AS lead_name
          FROM ${schema.leadActivitiesTable} la
          INNER JOIN ${schema.leadsTable} l ON l.id = la.lead_id
          LEFT JOIN ${schema.usersTable} u ON u.id = la.user_id
          ${whereSql}
          ORDER BY la.created_at DESC
          LIMIT ?
        `,
        [...params, limit],
      );

      return {
        byType: typeRows.map((row) => ({
          activityType: row.activity_type,
          total: toNumber(row.total, 0),
        })),
        items: listRows.map((row) => ({
          id: row.id,
          leadId: row.lead_id,
          leadName: row.lead_name,
          userId: row.user_id,
          consultantName: row.consultant_name,
          activityType: row.activity_type,
          notes: row.notes,
          createdAt: row.created_at,
        })),
      };
    },

    async getMonthlySummary(filters = {}) {
      const range = buildDateRangeClause("b.created_at", filters);
      const bookingClauses = [];
      const bookingParams = [...range.params];
      if (range.sql) bookingClauses.push(range.sql.replace(/^WHERE\s+/i, ""));
      if (filters.userId) {
        bookingClauses.push("q.created_by = ?");
        bookingParams.push(filters.userId);
      }
      const bookingWhere =
        bookingClauses.length ?
          `WHERE ${bookingClauses.join(" AND ")}`
        : "";

      const leadParams = [];
      const leadWhere = filters.userId ? `WHERE assigned_to = ?` : "";
      if (filters.userId) leadParams.push(filters.userId);

      const rows = await queryRows(
        `
          WITH lead_stats AS (
            SELECT
              COUNT(*) AS total_leads,
              SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
            FROM ${schema.leadsTable}
            ${leadWhere}
          ),
          booking_stats AS (
            SELECT
              COUNT(*) AS total_bookings,
              SUM(COALESCE(total_amount, 0)) AS revenue,
              SUM(COALESCE(cost_amount, 0)) AS cost
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            ${bookingWhere}
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
        [...leadParams, ...bookingParams],
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
      const {
        sql: bookingWhereSql,
        params: bookingParams,
      } = bookingLeadWhereFromRange(bookingRange, filters);

      const leadRange = buildDateRangeClause("l.created_at", filters);
      const { sql: leadWhereSql, params: leadParams } = leadWhereFromRange(
        leadRange,
        filters,
      );

      const refundRange = buildDateRangeClause("r.created_at", filters);
      const refundClauses = [];
      const refundParams = [...refundRange.params];
      if (refundRange.sql)
        refundClauses.push(refundRange.sql.replace(/^WHERE\s+/i, ""));
      const refundAssign = leadAssignmentScope(filters, "l");
      refundAssign.clauses.forEach((c) => refundClauses.push(c));
      refundParams.push(...refundAssign.params);
      const refundWhereSql =
        refundClauses.length ? `WHERE ${refundClauses.join(" AND ")}` : "";

      const sellKpi = bookingSellAmountSql();
      const bookingRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_bookings,
            SUM(${sellKpi}) AS total_revenue,
            SUM(COALESCE(b.cost_amount, 0)) AS total_cost,
            SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${bookingWhereSql}
        `,
        bookingParams,
      );

      const leadRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads,
            SUM(CASE WHEN COALESCE(l.lead_type, 'HOLIDAY') = 'VISA' THEN 1 ELSE 0 END) AS visa_leads,
            SUM(CASE WHEN COALESCE(l.lead_type, 'HOLIDAY') <> 'VISA' THEN 1 ELSE 0 END) AS holiday_leads
          FROM ${schema.leadsTable} l
          ${leadWhereSql}
        `,
        leadParams,
      );

      const serviceRevenueRows = await queryRows(
        `
          WITH service_revenue AS (
            SELECT
              CASE
                WHEN COALESCE(l.lead_type, 'HOLIDAY') = 'VISA' THEN 'VISA'
                ELSE 'HOLIDAY'
              END AS service_type,
              ${sellKpi} AS total_amount
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${bookingWhereSql}
          )
          SELECT
            service_type,
            SUM(total_amount) AS revenue
          FROM service_revenue
          GROUP BY service_type
        `,
        bookingParams,
      );

      const assignFollow = leadAssignmentScope(filters, "l");
      const followClauses =
        assignFollow.clauses.length > 0
          ? `AND ${assignFollow.clauses.join(" AND ")}`
          : "";

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
          INNER JOIN ${schema.leadsTable} l ON l.id = f.lead_id
          WHERE 1 = 1
          ${followClauses}
        `,
        assignFollow.params,
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
          INNER JOIN ${schema.bookingsTable} b ON b.id = r.booking_id
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${refundWhereSql}
        `,
        refundParams,
      );

      const booking = bookingRows[0] || {};
      const leads = leadRows[0] || {};
      const followups = followupRows[0] || {};
      const active = activeAgentsRows[0] || {};
      const refunds = refundRows[0] || {};

      const totalLeads = toNumber(leads.total_leads, 0);
      const convertedLeads = toNumber(leads.converted_leads, 0);
      const holidayLeads = toNumber(leads.holiday_leads, 0);
      const visaLeads = toNumber(leads.visa_leads, 0);
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
        holidayLeads,
        visaLeads,
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

    async getExecutiveBookingRevenueByCurrency(filters = {}) {
      const bookingRange = buildDateRangeClause("b.created_at", filters);
      const {
        sql: bookingWhereSql,
        params: bookingParams,
      } = bookingLeadWhereFromRange(bookingRange, filters);
      const sellBk = bookingSellAmountSql();
      return queryRows(
        `
          SELECT
            UPPER(
              COALESCE(
                NULLIF(TRIM(q.client_currency), ''),
                NULLIF(TRIM(l.client_currency), ''),
                NULLIF(TRIM(q.cost_currency), ''),
                NULLIF(TRIM(q.supplier_currency), ''),
                'AED'
              )
            ) AS currency,
            SUM(${sellBk}) AS revenue
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
          ${bookingWhereSql}
          GROUP BY
            UPPER(
              COALESCE(
                NULLIF(TRIM(q.client_currency), ''),
                NULLIF(TRIM(l.client_currency), ''),
                NULLIF(TRIM(q.cost_currency), ''),
                NULLIF(TRIM(q.supplier_currency), ''),
                'AED'
              )
            )
        `,
        bookingParams,
      );
    },

    async getExecutiveServiceRevenueByCurrency(filters = {}) {
      const bookingRange = buildDateRangeClause("b.created_at", filters);
      const {
        sql: bookingWhereSql,
        params: bookingParams,
      } = bookingLeadWhereFromRange(bookingRange, filters);
      const sellSr = bookingSellAmountSql();
      return queryRows(
        `
          WITH service_revenue AS (
            SELECT
              CASE
                WHEN COALESCE(l.lead_type, 'HOLIDAY') = 'VISA' THEN 'VISA'
                ELSE 'HOLIDAY'
              END AS service_type,
              UPPER(
                COALESCE(
                  NULLIF(TRIM(q.client_currency), ''),
                  NULLIF(TRIM(l.client_currency), ''),
                  NULLIF(TRIM(q.cost_currency), ''),
                  NULLIF(TRIM(q.supplier_currency), ''),
                  'AED'
                )
              ) AS currency,
              ${sellSr} AS total_amount
            FROM ${schema.bookingsTable} b
            LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
            LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
            ${bookingWhereSql}
          )
          SELECT
            service_type,
            currency,
            SUM(total_amount) AS revenue
          FROM service_revenue
          GROUP BY service_type, currency
        `,
        bookingParams,
      );
    },

    async getConversionFunnel(filters = {}) {
      const range = buildDateRangeClause("l.created_at", filters);
      const { sql: whereSql, params } = leadWhereFromRange(range, filters);
      const rows = await queryRows(
        `
          SELECT
            l.status,
            COUNT(*) AS total
          FROM ${schema.leadsTable} l
          ${whereSql}
          GROUP BY l.status
        `,
        params,
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
      const { sql: leadWhereSql, params: leadWhereParams } = leadWhereFromRange(
        range,
        filters,
      );
      const marketingParams = [...leadWhereParams, ...leadWhereParams];
      const rows = await queryRows(
        `
          WITH lead_stats AS (
            SELECT
              l.campaign_id,
              COUNT(*) AS total_leads,
              SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
            FROM ${schema.leadsTable} l
            ${leadWhereSql}
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
            ${leadWhereSql}
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
        marketingParams,
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

      const openPipelineClause = filters.userId
        ? " AND l.assigned_to = ?"
        : "";
      const openPipelineParams = filters.userId ? [filters.userId] : [];

      const openPipelineRows = await queryRows(
        `
          SELECT
            COUNT(*) AS open_pipeline_leads
          FROM ${schema.leadsTable} l
          WHERE l.status NOT IN ('CONVERTED', 'LOST')
          ${openPipelineClause}
        `,
        openPipelineParams,
      );

      const trailingLeadClause = filters.userId
        ? " AND l.assigned_to = ?"
        : "";
      const trailingLeadParams = filters.userId ? [filters.userId] : [];

      const conversionRows = await queryRows(
        `
          SELECT
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) AS converted_leads
          FROM ${schema.leadsTable} l
          WHERE l.created_at >= (CURRENT_TIMESTAMP - INTERVAL 90 DAY)
          ${trailingLeadClause}
        `,
        trailingLeadParams,
      );

      const bookingClause = filters.userId ? " AND q.created_by = ?" : "";
      const bookingParams = filters.userId ? [filters.userId] : [];

      const bookingRows = await queryRows(
        `
          SELECT
            AVG(COALESCE(b.total_amount, 0)) AS avg_booking_value
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          WHERE b.created_at >= (CURRENT_TIMESTAMP - INTERVAL 90 DAY)
          ${bookingClause}
        `,
        bookingParams,
      );

      const seasonalityRows = await queryRows(
        `
          SELECT
            DATE_FORMAT(b.created_at, '%Y-%m') AS month,
            SUM(COALESCE(b.total_amount, 0)) AS revenue
          FROM ${schema.bookingsTable} b
          LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
          WHERE b.created_at >= (CURRENT_TIMESTAMP - INTERVAL 12 MONTH)
          ${bookingClause}
          GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
          ORDER BY DATE_FORMAT(b.created_at, '%Y-%m')
        `,
        bookingParams,
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
