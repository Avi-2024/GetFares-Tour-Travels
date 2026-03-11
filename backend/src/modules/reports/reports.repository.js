function createReportsRepository({ db, schema }) {
  function canUseRawQuery() {
    return typeof db.query === 'function' && Boolean(db.pool);
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
      clauses.push(`${columnName} >= $${nextIndex}`);
      params.push(filters.from);
      nextIndex += 1;
    }

    if (filters.to) {
      clauses.push(`${columnName} <= $${nextIndex}`);
      params.push(filters.to);
      nextIndex += 1;
    }

    return {
      sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
      nextIndex,
    };
  }

  async function queryRows(sql, params = []) {
    if (!canUseRawQuery()) {
      return [];
    }
    const result = await db.query(sql, params);
    return result.rows;
  }

  return Object.freeze({
    async getLeadsBySource(filters = {}) {
      const range = buildDateRangeClause('l.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            COALESCE(l.source, 'UNKNOWN') AS source,
            COUNT(*)::int AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END)::int AS converted_leads
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
          conversionRatePercent: total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0,
        };
      });
    },

    async getLeadsByConsultant(filters = {}) {
      const range = buildDateRangeClause('l.created_at', filters);
      const params = [...range.params];
      const whereClauses = range.sql ? [range.sql.replace(/^WHERE\s+/i, '')] : [];

      if (filters.userId) {
        whereClauses.push(`l.assigned_to = $${params.length + 1}`);
        params.push(filters.userId);
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const rows = await queryRows(
        `
          SELECT
            u.id AS user_id,
            u.full_name AS consultant_name,
            COUNT(l.id)::int AS total_leads,
            SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END)::int AS converted_leads,
            AVG(
              CASE
                WHEN l.response_at IS NOT NULL AND l.created_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (l.response_at - l.created_at)) / 60
                ELSE NULL
              END
            )::numeric(10,2) AS avg_response_minutes
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
          conversionRatePercent: total > 0 ? Number(((converted / total) * 100).toFixed(2)) : 0,
          averageResponseMinutes: toNumber(row.avg_response_minutes, 0),
        };
      });
    },

    async getLeadAgingReport(filters = {}) {
      const range = buildDateRangeClause('l.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            l.id,
            l.full_name,
            l.status,
            l.assigned_to,
            u.full_name AS consultant_name,
            l.created_at,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.created_at)) / 3600 AS age_hours
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
      const range = buildDateRangeClause('l.updated_at', filters);
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
          ${range.sql ? `AND ${range.sql.replace(/^WHERE\s+/i, '')}` : ''}
          ORDER BY l.updated_at DESC
        `,
        range.params,
      );

      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        source: row.source,
        closedReason: row.closed_reason || 'UNSPECIFIED',
        lostAt: row.lost_at,
      }));
    },

    async getRevenueByMonth(filters = {}) {
      const range = buildDateRangeClause('b.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            TO_CHAR(DATE_TRUNC('month', b.created_at), 'YYYY-MM') AS month,
            SUM(COALESCE(b.total_amount, 0))::numeric(14,2) AS revenue,
            SUM(COALESCE(b.cost_amount, 0))::numeric(14,2) AS cost,
            SUM(COALESCE(b.total_amount, 0) - COALESCE(b.cost_amount, 0))::numeric(14,2) AS profit
          FROM ${schema.bookingsTable} b
          ${range.sql}
          GROUP BY DATE_TRUNC('month', b.created_at)
          ORDER BY DATE_TRUNC('month', b.created_at)
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
      const range = buildDateRangeClause('b.created_at', filters);
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
            COUNT(*)::int AS total_bookings,
            SUM(COALESCE(total_amount, 0))::numeric(14,2) AS revenue
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
      const range = buildDateRangeClause('b.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            COALESCE(d.name, 'UNKNOWN') AS destination,
            COUNT(*)::int AS total_bookings,
            SUM(COALESCE(b.total_amount, 0))::numeric(14,2) AS revenue
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
        where.push(`b.created_at >= $${params.length}`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`b.created_at <= $${params.length}`);
      }
      if (filters.userId) {
        params.push(filters.userId);
        where.push(`u.id = $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const rows = await queryRows(
        `
          SELECT
            u.id AS user_id,
            u.full_name,
            COALESCE(u.target_amount, 0)::numeric(14,2) AS target_amount,
            SUM(COALESCE(b.total_amount, 0))::numeric(14,2) AS achieved_amount
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
          achievementPercent: target > 0 ? Number(((achieved / target) * 100).toFixed(2)) : 0,
        };
      });
    },

    async getOutstandingPayments(filters = {}) {
      const range = buildDateRangeClause('b.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            b.id AS booking_id,
            b.booking_number,
            b.total_amount,
            b.advance_received,
            (COALESCE(b.total_amount, 0) - COALESCE(b.advance_received, 0))::numeric(14,2) AS outstanding_amount,
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
      const range = buildDateRangeClause('p.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            p.payment_mode,
            COUNT(*)::int AS total_payments,
            SUM(COALESCE(p.amount, 0))::numeric(14,2) AS total_amount
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
      const range = buildDateRangeClause('b.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            COUNT(*)::int AS total_bookings,
            SUM(COALESCE(b.total_amount, 0))::numeric(14,2) AS total_revenue,
            SUM(COALESCE(b.cost_amount, 0))::numeric(14,2) AS total_cost,
            SUM(COALESCE(b.total_amount, 0) - COALESCE(b.cost_amount, 0))::numeric(14,2) AS total_profit
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
        marginPercent: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
      };
    },

    async getVisaSummary(filters = {}) {
      const range = buildDateRangeClause('vc.created_at', filters);
      const rows = await queryRows(
        `
          SELECT
            COUNT(*)::int AS total_cases,
            SUM(CASE WHEN vc.status = 'APPROVED' THEN 1 ELSE 0 END)::int AS approved_cases,
            SUM(CASE WHEN vc.status = 'REJECTED' THEN 1 ELSE 0 END)::int AS rejected_cases,
            SUM(CASE WHEN vc.status = 'DOCUMENT_PENDING' THEN 1 ELSE 0 END)::int AS pending_document_cases,
            AVG(
              CASE
                WHEN vc.submission_date IS NOT NULL AND vc.appointment_date IS NOT NULL
                THEN (vc.appointment_date - vc.submission_date)
                ELSE NULL
              END
            )::numeric(10,2) AS average_processing_days
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
        successRatePercent: total > 0 ? Number(((approved / total) * 100).toFixed(2)) : 0,
        rejectionRatePercent: total > 0 ? Number(((rejected / total) * 100).toFixed(2)) : 0,
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
          WHERE DATE(f.followup_date) = $1
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
          WHERE DATE(f.followup_date) < $1
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

    async getMonthlySummary(filters = {}) {
      const where = [];
      const params = [];
      if (filters.from) {
        params.push(filters.from);
        where.push(`b.created_at >= $${params.length}`);
      }
      if (filters.to) {
        params.push(filters.to);
        where.push(`b.created_at <= $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const rows = await queryRows(
        `
          WITH lead_stats AS (
            SELECT
              COUNT(*)::int AS total_leads,
              SUM(CASE WHEN status = 'CONVERTED' THEN 1 ELSE 0 END)::int AS converted_leads
            FROM ${schema.leadsTable}
          ),
          booking_stats AS (
            SELECT
              COUNT(*)::int AS total_bookings,
              SUM(COALESCE(total_amount, 0))::numeric(14,2) AS revenue,
              SUM(COALESCE(cost_amount, 0))::numeric(14,2) AS cost
            FROM ${schema.bookingsTable} b
            ${whereSql}
          )
          SELECT
            ls.total_leads,
            ls.converted_leads,
            bs.total_bookings,
            bs.revenue,
            bs.cost,
            (COALESCE(bs.revenue, 0) - COALESCE(bs.cost, 0))::numeric(14,2) AS profit
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
        conversionRatePercent: totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0,
        revenue,
        cost: toNumber(row.cost, 0),
        profit,
        avgBookingValue: totalBookings > 0 ? Number((revenue / totalBookings).toFixed(2)) : 0,
        avgMarginPercent: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
      };
    },
  });
}

module.exports = { createReportsRepository };
