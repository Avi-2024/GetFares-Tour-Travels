import { logger } from '../../core/logger/index.js';

const DEFAULT_STATS = Object.freeze({
  current: {
    totalLeads: 0,
    revenue: 0,
    pendingCalls: 0,
    bookings: 0,
  },
  previous: {
    totalLeads: 0,
    revenue: 0,
    pendingCalls: 0,
    bookings: 0,
  },
});

const DEFAULT_REVENUE = Object.freeze([]);
const DEFAULT_LEAD_SOURCES = Object.freeze([]);

const PENDING_LEAD_STATUSES = Object.freeze([
  'OPEN',
  'CONTACTED',
  'WIP',
  'FOLLOW_UP',
]);

class DashboardRepository {
  constructor(dependencies = {}) {
    this.db = dependencies.db;
    this.log = dependencies.logger ?? logger;
    this.tables = {
      leads: 'leads',
      quotations: 'quotations',
      bookings: 'bookings',
    };
    this.columnCache = new Map();
  }

  canUseRawQuery() {
    return (
      this.db &&
      typeof this.db.query === 'function' &&
      Boolean(this.db.pool)
    );
  }

  toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  normalizePeriod(period = 'month') {
    const normalized = String(period).toLowerCase();
    if (normalized === 'today') return 'day';
    if (normalized === 'day') return 'day';
    if (normalized === 'week') return 'week';
    if (normalized === 'month') return 'month';
    if (normalized === 'year') return 'year';
    return 'month';
  }

  normalizeRange(range = 'week') {
    const normalized = String(range).toLowerCase();
    if (normalized === 'today') return 'today';
    if (normalized === 'week') return 'week';
    if (normalized === 'month') return 'month';
    if (normalized === 'year') return 'year';
    return 'week';
  }

  getPeriodStartSql(period) {
    switch (period) {
      case 'day':
        return "DATE_TRUNC('day', CURRENT_TIMESTAMP)";
      case 'week':
        return "DATE_TRUNC('week', CURRENT_TIMESTAMP)";
      case 'year':
        return "DATE_TRUNC('year', CURRENT_TIMESTAMP)";
      case 'month':
      default:
        return "DATE_TRUNC('month', CURRENT_TIMESTAMP)";
    }
  }

  getPeriodInterval(period) {
    switch (period) {
      case 'day':
        return '1 day';
      case 'week':
        return '1 week';
      case 'year':
        return '1 year';
      case 'month':
      default:
        return '1 month';
    }
  }

  async hasColumn(tableName, columnName) {
    if (!this.canUseRawQuery()) {
      return false;
    }

    const cacheKey = `${tableName}.${columnName}`;
    if (this.columnCache.has(cacheKey)) {
      return this.columnCache.get(cacheKey);
    }

    try {
      const result = await this.db.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
          LIMIT 1
        `,
        [tableName, columnName],
      );

      const exists = result.rowCount > 0;
      this.columnCache.set(cacheKey, exists);
      return exists;
    } catch (error) {
      this.log.warn(
        { err: error, tableName, columnName },
        'Failed to inspect column metadata for dashboard repository.',
      );
      this.columnCache.set(cacheKey, false);
      return false;
    }
  }

  async resolveRevenueExpression(alias = 'q') {
    const table = this.tables.quotations;

    if (await this.hasColumn(table, 'total_sale_value')) {
      return `COALESCE(${alias}.total_sale_value, 0)`;
    }

    if (await this.hasColumn(table, 'final_price')) {
      return `COALESCE(${alias}.final_price, 0)`;
    }

    if (await this.hasColumn(table, 'total_amount')) {
      return `COALESCE(${alias}.total_amount, 0)`;
    }

    return '0';
  }

  async getSoftDeleteClause(tableName, alias) {
    if (await this.hasColumn(tableName, 'is_deleted')) {
      return ` AND COALESCE(${alias}.is_deleted, FALSE) = FALSE`;
    }

    return '';
  }

  async queryRows(sql, params = []) {
    if (!this.canUseRawQuery()) {
      return [];
    }

    const result = await this.db.query(sql, params);
    return result.rows || [];
  }

  async querySingle(sql, params = []) {
    const rows = await this.queryRows(sql, params);
    return rows[0] || null;
  }

  async getStats(period = 'month') {
    try {
      if (!this.canUseRawQuery()) {
        return DEFAULT_STATS;
      }

      const normalizedPeriod = this.normalizePeriod(period);
      const periodStartSql = this.getPeriodStartSql(normalizedPeriod);
      const previousStartSql = `${periodStartSql} - INTERVAL '${this.getPeriodInterval(normalizedPeriod)}'`;

      const revenueExpression = await this.resolveRevenueExpression('q');
      const quotationSoftDeleteClause = await this.getSoftDeleteClause(
        this.tables.quotations,
        'q',
      );
      const leadSoftDeleteClause = await this.getSoftDeleteClause(
        this.tables.leads,
        'l',
      );

      const currentQuery = `
        SELECT
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.leads} l
            WHERE l.created_at >= ${periodStartSql}
            ${leadSoftDeleteClause}
          ) AS total_leads,
          (
            SELECT COALESCE(SUM(${revenueExpression}), 0)::numeric(14,2)
            FROM ${this.tables.quotations} q
            WHERE q.created_at >= ${periodStartSql}
              AND q.status = 'APPROVED'
              ${quotationSoftDeleteClause}
          ) AS revenue,
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.leads} l
            WHERE l.next_followup_date IS NOT NULL
              AND l.next_followup_date <= CURRENT_DATE
              AND COALESCE(l.status::text, '') = ANY($1::text[])
              ${leadSoftDeleteClause}
          ) AS pending_calls,
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= ${periodStartSql}
          ) AS bookings
      `;

      const previousQuery = `
        SELECT
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.leads} l
            WHERE l.created_at >= ${previousStartSql}
              AND l.created_at < ${periodStartSql}
            ${leadSoftDeleteClause}
          ) AS total_leads,
          (
            SELECT COALESCE(SUM(${revenueExpression}), 0)::numeric(14,2)
            FROM ${this.tables.quotations} q
            WHERE q.created_at >= ${previousStartSql}
              AND q.created_at < ${periodStartSql}
              AND q.status = 'APPROVED'
              ${quotationSoftDeleteClause}
          ) AS revenue,
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.leads} l
            WHERE l.next_followup_date IS NOT NULL
              AND l.next_followup_date < ${periodStartSql}::date
              AND COALESCE(l.status::text, '') = ANY($1::text[])
              ${leadSoftDeleteClause}
          ) AS pending_calls,
          (
            SELECT COUNT(*)::int
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= ${previousStartSql}
              AND b.created_at < ${periodStartSql}
          ) AS bookings
      `;

      const [currentResult, previousResult] = await Promise.all([
        this.querySingle(currentQuery, [PENDING_LEAD_STATUSES]),
        this.querySingle(previousQuery, [PENDING_LEAD_STATUSES]),
      ]);

      return {
        current: {
          totalLeads: this.toNumber(currentResult?.total_leads),
          revenue: this.toNumber(currentResult?.revenue),
          pendingCalls: this.toNumber(currentResult?.pending_calls),
          bookings: this.toNumber(currentResult?.bookings),
        },
        previous: {
          totalLeads: this.toNumber(previousResult?.total_leads),
          revenue: this.toNumber(previousResult?.revenue),
          pendingCalls: this.toNumber(previousResult?.pending_calls),
          bookings: this.toNumber(previousResult?.bookings),
        },
      };
    } catch (error) {
      this.log.error({ err: error, period }, 'Error fetching dashboard stats.');
      return DEFAULT_STATS;
    }
  }

  async getRevenue(range = 'week') {
    try {
      if (!this.canUseRawQuery()) {
        return DEFAULT_REVENUE;
      }

      const normalizedRange = this.normalizeRange(range);
      const bookingRevenueExpression = `COALESCE(b.total_amount, 0)`;
      const bookingSoftDeleteClause = await this.getSoftDeleteClause(
        this.tables.bookings,
        'b',
      );

      const bookedRevenueWhere = `COALESCE(b.status::text, '') <> 'CANCELLED'${bookingSoftDeleteClause}`;

      const queries = {
        today: `
          WITH hourly_slots AS (
            SELECT generate_series(
              DATE_TRUNC('day', CURRENT_TIMESTAMP),
              DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '23 hours',
              INTERVAL '1 hour'
            ) AS slot_start
          ),
          current_period AS (
            SELECT
              DATE_TRUNC('hour', b.created_at) AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP)
              AND b.created_at < DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          ),
          previous_period AS (
            SELECT
              DATE_TRUNC('hour', b.created_at + INTERVAL '1 day') AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP) - INTERVAL '1 day'
              AND b.created_at < DATE_TRUNC('day', CURRENT_TIMESTAMP)
              AND ${bookedRevenueWhere}
            GROUP BY 1
          )
          SELECT
            TO_CHAR(h.slot_start, 'HH24:00') AS name,
            COALESCE(c.revenue, 0)::numeric(14,2) AS revenue,
            COALESCE(p.revenue, 0)::numeric(14,2) AS last
          FROM hourly_slots h
          LEFT JOIN current_period c ON c.slot_start = h.slot_start
          LEFT JOIN previous_period p ON p.slot_start = h.slot_start
          ORDER BY h.slot_start
        `,
        week: `
          WITH daily_slots AS (
            SELECT generate_series(
              DATE_TRUNC('day', CURRENT_TIMESTAMP) - INTERVAL '6 days',
              DATE_TRUNC('day', CURRENT_TIMESTAMP),
              INTERVAL '1 day'
            ) AS slot_start
          ),
          current_period AS (
            SELECT
              DATE_TRUNC('day', b.created_at) AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP) - INTERVAL '6 days'
              AND b.created_at < DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          ),
          previous_period AS (
            SELECT
              DATE_TRUNC('day', b.created_at + INTERVAL '7 days') AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP) - INTERVAL '13 days'
              AND b.created_at < DATE_TRUNC('day', CURRENT_TIMESTAMP) - INTERVAL '6 days'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          )
          SELECT
            TO_CHAR(d.slot_start, 'Dy') AS name,
            COALESCE(c.revenue, 0)::numeric(14,2) AS revenue,
            COALESCE(p.revenue, 0)::numeric(14,2) AS last
          FROM daily_slots d
          LEFT JOIN current_period c ON c.slot_start = d.slot_start
          LEFT JOIN previous_period p ON p.slot_start = d.slot_start
          ORDER BY d.slot_start
        `,
        month: `
          WITH weekly_slots AS (
            SELECT generate_series(
              DATE_TRUNC('week', CURRENT_TIMESTAMP) - INTERVAL '3 weeks',
              DATE_TRUNC('week', CURRENT_TIMESTAMP),
              INTERVAL '1 week'
            ) AS slot_start
          ),
          current_period AS (
            SELECT
              DATE_TRUNC('week', b.created_at) AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) - INTERVAL '3 weeks'
              AND b.created_at < DATE_TRUNC('week', CURRENT_TIMESTAMP) + INTERVAL '1 week'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          ),
          previous_period AS (
            SELECT
              DATE_TRUNC('week', b.created_at + INTERVAL '4 weeks') AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) - INTERVAL '7 weeks'
              AND b.created_at < DATE_TRUNC('week', CURRENT_TIMESTAMP) - INTERVAL '3 weeks'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          )
          SELECT
            CONCAT('W', ROW_NUMBER() OVER (ORDER BY w.slot_start)) AS name,
            COALESCE(c.revenue, 0)::numeric(14,2) AS revenue,
            COALESCE(p.revenue, 0)::numeric(14,2) AS last
          FROM weekly_slots w
          LEFT JOIN current_period c ON c.slot_start = w.slot_start
          LEFT JOIN previous_period p ON p.slot_start = w.slot_start
          ORDER BY w.slot_start
        `,
        year: `
          WITH monthly_slots AS (
            SELECT generate_series(
              DATE_TRUNC('month', CURRENT_TIMESTAMP) - INTERVAL '11 months',
              DATE_TRUNC('month', CURRENT_TIMESTAMP),
              INTERVAL '1 month'
            ) AS slot_start
          ),
          current_period AS (
            SELECT
              DATE_TRUNC('month', b.created_at) AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) - INTERVAL '11 months'
              AND b.created_at < DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          ),
          previous_period AS (
            SELECT
              DATE_TRUNC('month', b.created_at + INTERVAL '1 year') AS slot_start,
              SUM(${bookingRevenueExpression})::numeric(14,2) AS revenue
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP) - INTERVAL '23 months'
              AND b.created_at < DATE_TRUNC('month', CURRENT_TIMESTAMP) - INTERVAL '11 months'
              AND ${bookedRevenueWhere}
            GROUP BY 1
          )
          SELECT
            TO_CHAR(m.slot_start, 'Mon') AS name,
            COALESCE(c.revenue, 0)::numeric(14,2) AS revenue,
            COALESCE(p.revenue, 0)::numeric(14,2) AS last
          FROM monthly_slots m
          LEFT JOIN current_period c ON c.slot_start = m.slot_start
          LEFT JOIN previous_period p ON p.slot_start = m.slot_start
          ORDER BY m.slot_start
        `,
      };

      const rows = await this.queryRows(queries[normalizedRange]);
      return rows.map((row) => ({
        name: String(row.name ?? ''),
        revenue: this.toNumber(row.revenue),
        last: this.toNumber(row.last),
      }));
    } catch (error) {
      this.log.error({ err: error, range }, 'Error fetching revenue data.');
      return DEFAULT_REVENUE;
    }
  }

  async getLeadSources(period = 'month') {
    try {
      if (!this.canUseRawQuery()) {
        return DEFAULT_LEAD_SOURCES;
      }

      const normalizedPeriod = this.normalizePeriod(period);
      const periodStartSql = this.getPeriodStartSql(normalizedPeriod);
      const leadSoftDeleteClause = await this.getSoftDeleteClause(
        this.tables.leads,
        'l',
      );

      const rows = await this.queryRows(`
        WITH filtered_leads AS (
          SELECT
            COALESCE(NULLIF(TRIM(l.source), ''), 'Unknown') AS source_name
          FROM ${this.tables.leads} l
          WHERE l.created_at >= ${periodStartSql}
          ${leadSoftDeleteClause}
        ),
        source_counts AS (
          SELECT
            source_name,
            COUNT(*)::int AS source_count
          FROM filtered_leads
          GROUP BY source_name
        ),
        totals AS (
          SELECT COALESCE(SUM(source_count), 0)::numeric AS total_count
          FROM source_counts
        )
        SELECT
          s.source_name AS name,
          CASE
            WHEN t.total_count > 0
            THEN ROUND((s.source_count::numeric * 100.0) / t.total_count, 1)
            ELSE 0
          END AS value
        FROM source_counts s
        CROSS JOIN totals t
        ORDER BY s.source_count DESC, s.source_name ASC
      `);

      return rows.map((row) => ({
        name: String(row.name ?? 'Unknown'),
        value: this.toNumber(row.value),
      }));
    } catch (error) {
      this.log.error({ err: error, period }, 'Error fetching lead sources.');
      return DEFAULT_LEAD_SOURCES;
    }
  }
}

function createDashboardRepository(dependencies) {
  return new DashboardRepository(dependencies);
}

export { DashboardRepository, createDashboardRepository };
