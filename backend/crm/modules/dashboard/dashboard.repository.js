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
    const adapter = String(this.db.adapter || '').toLowerCase();
    return (
      this.db &&
      typeof this.db.query === 'function' &&
      Boolean(this.db.pool) &&
      (adapter === 'mysql')
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

  getPeriodBoundary(period, reference = new Date()) {
    const date = new Date(reference);
    if (period === 'day') {
      date.setHours(0, 0, 0, 0);
      return date;
    }
    if (period === 'week') {
      date.setHours(0, 0, 0, 0);
      const day = date.getDay();
      const diff = (day + 6) % 7; // Monday start
      date.setDate(date.getDate() - diff);
      return date;
    }
    if (period === 'year') {
      return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  shiftPeriod(period, dateInput, count = 1) {
    const date = new Date(dateInput);
    if (period === 'day') {
      date.setDate(date.getDate() + count);
      return date;
    }
    if (period === 'week') {
      date.setDate(date.getDate() + 7 * count);
      return date;
    }
    if (period === 'year') {
      date.setFullYear(date.getFullYear() + count);
      return date;
    }
    date.setMonth(date.getMonth() + count);
    return date;
  }

  parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  isSoftDeleted(row) {
    return Boolean(row?.is_deleted ?? row?.isDeleted ?? false);
  }

  getRevenueFromQuotation(row) {
    return this.toNumber(
      row?.total_sale_value ??
        row?.totalSaleValue ??
        row?.final_price ??
        row?.finalPrice ??
        row?.total_amount ??
        row?.totalAmount ??
        0,
      0,
    );
  }

  getRevenueFromBooking(row) {
    return this.toNumber(row?.total_amount ?? row?.totalAmount ?? 0, 0);
  }

  bucketLabel(date, range, index = 0) {
    if (range === 'today') {
      return `${String(date.getHours()).padStart(2, '0')}:00`;
    }
    if (range === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    if (range === 'month') {
      return `W${index + 1}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  async getStatsFallback(period = 'month') {
    const normalizedPeriod = this.normalizePeriod(period);
    const now = new Date();
    const currentStart = this.getPeriodBoundary(normalizedPeriod, now);
    const previousStart = this.shiftPeriod(normalizedPeriod, currentStart, -1);
    const currentEnd = this.shiftPeriod(normalizedPeriod, currentStart, 1);

    const [leads, quotations, bookings] = await Promise.all([
      this.db.findMany(this.tables.leads, {}),
      this.db.findMany(this.tables.quotations, {}),
      this.db.findMany(this.tables.bookings, {}),
    ]);

    const leadRows = (Array.isArray(leads) ? leads : []).filter(
      (row) => !this.isSoftDeleted(row),
    );
    const quotationRows = (Array.isArray(quotations) ? quotations : []).filter(
      (row) => !this.isSoftDeleted(row),
    );
    const bookingRows = Array.isArray(bookings) ? bookings : [];

    const inWindow = (date, start, end) =>
      date && date.getTime() >= start.getTime() && date.getTime() < end.getTime();

    const pendingCallCount = (rows, start, end, previous = false) => {
      const statuses = new Set(PENDING_LEAD_STATUSES);
      return rows.filter((row) => {
        const createdAt = this.parseDate(row.created_at ?? row.createdAt);
        if (!inWindow(createdAt, start, end)) {
          return false;
        }
        const status = String(row.status || '').toUpperCase();
        if (!statuses.has(status)) return false;
        const followup = this.parseDate(row.next_followup_date ?? row.nextFollowupDate);
        if (!followup) return false;
        if (previous) {
          return followup.getTime() < start.getTime();
        }
        return followup.getTime() <= now.getTime();
      }).length;
    };

    const currentRevenue = quotationRows
      .filter((row) => String(row.status || '').toUpperCase() === 'APPROVED')
      .filter((row) => inWindow(this.parseDate(row.created_at ?? row.createdAt), currentStart, currentEnd))
      .reduce((sum, row) => sum + this.getRevenueFromQuotation(row), 0);

    const previousRevenue = quotationRows
      .filter((row) => String(row.status || '').toUpperCase() === 'APPROVED')
      .filter((row) => inWindow(this.parseDate(row.created_at ?? row.createdAt), previousStart, currentStart))
      .reduce((sum, row) => sum + this.getRevenueFromQuotation(row), 0);

    const currentLeads = leadRows.filter((row) =>
      inWindow(this.parseDate(row.created_at ?? row.createdAt), currentStart, currentEnd),
    ).length;

    const previousLeads = leadRows.filter((row) =>
      inWindow(this.parseDate(row.created_at ?? row.createdAt), previousStart, currentStart),
    ).length;

    const currentBookings = bookingRows.filter((row) =>
      inWindow(this.parseDate(row.created_at ?? row.createdAt), currentStart, currentEnd),
    ).length;

    const previousBookings = bookingRows.filter((row) =>
      inWindow(this.parseDate(row.created_at ?? row.createdAt), previousStart, currentStart),
    ).length;

    return {
      current: {
        totalLeads: currentLeads,
        revenue: Number(currentRevenue.toFixed(2)),
        pendingCalls: pendingCallCount(leadRows, currentStart, currentEnd, false),
        bookings: currentBookings,
      },
      previous: {
        totalLeads: previousLeads,
        revenue: Number(previousRevenue.toFixed(2)),
        pendingCalls: pendingCallCount(leadRows, previousStart, currentStart, true),
        bookings: previousBookings,
      },
    };
  }

  async getRevenueFallback(range = 'week') {
    const normalizedRange = this.normalizeRange(range);
    const bookings = await this.db.findMany(this.tables.bookings, {});
    const rows = (Array.isArray(bookings) ? bookings : []).filter((row) => {
      const status = String(row.status || '').toUpperCase();
      return status !== 'CANCELLED' && !this.isSoftDeleted(row);
    });

    const now = new Date();
    const buckets = [];

    if (normalizedRange === 'today') {
      const dayStart = this.getPeriodBoundary('day', now);
      for (let index = 0; index < 24; index += 1) {
        const start = new Date(dayStart.getTime() + index * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        const prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        buckets.push({ start, end, prevStart, prevEnd, index });
      }
    } else if (normalizedRange === 'week') {
      const end = this.shiftPeriod('day', this.getPeriodBoundary('day', now), 1);
      for (let index = 6; index >= 0; index -= 1) {
        const start = this.shiftPeriod('day', end, -(index + 1));
        const bucketEnd = this.shiftPeriod('day', start, 1);
        const prevStart = this.shiftPeriod('week', start, -1);
        const prevEnd = this.shiftPeriod('week', bucketEnd, -1);
        buckets.push({ start, end: bucketEnd, prevStart, prevEnd, index: 6 - index });
      }
    } else if (normalizedRange === 'month') {
      const monthStart = this.getPeriodBoundary('month', now);
      for (let week = 1; week <= 4; week += 1) {
        const start = this.shiftPeriod('week', monthStart, week - 1);
        const end = this.shiftPeriod('week', start, 1);
        const prevStart = this.shiftPeriod('month', start, -1);
        const prevEnd = this.shiftPeriod('month', end, -1);
        buckets.push({ start, end, prevStart, prevEnd, index: week - 1 });
      }
    } else {
      const yearStart = this.getPeriodBoundary('year', now);
      for (let month = 0; month < 12; month += 1) {
        const start = new Date(yearStart.getFullYear(), month, 1);
        const end = new Date(yearStart.getFullYear(), month + 1, 1);
        const prevStart = new Date(yearStart.getFullYear() - 1, month, 1);
        const prevEnd = new Date(yearStart.getFullYear() - 1, month + 1, 1);
        buckets.push({ start, end, prevStart, prevEnd, index: month });
      }
    }

    return buckets.map((bucket) => {
      const revenue = rows
        .filter((row) => {
          const created = this.parseDate(row.created_at ?? row.createdAt);
          return (
            created &&
            created.getTime() >= bucket.start.getTime() &&
            created.getTime() < bucket.end.getTime()
          );
        })
        .reduce((sum, row) => sum + this.getRevenueFromBooking(row), 0);

      const last = rows
        .filter((row) => {
          const created = this.parseDate(row.created_at ?? row.createdAt);
          return (
            created &&
            created.getTime() >= bucket.prevStart.getTime() &&
            created.getTime() < bucket.prevEnd.getTime()
          );
        })
        .reduce((sum, row) => sum + this.getRevenueFromBooking(row), 0);

      return {
        name: this.bucketLabel(bucket.start, normalizedRange, bucket.index),
        revenue: Number(revenue.toFixed(2)),
        last: Number(last.toFixed(2)),
      };
    });
  }

  async getLeadSourcesFallback(period = 'month') {
    const normalizedPeriod = this.normalizePeriod(period);
    const start = this.getPeriodBoundary(normalizedPeriod, new Date());
    const leads = await this.db.findMany(this.tables.leads, {});
    const sourceCounts = new Map();

    (Array.isArray(leads) ? leads : [])
      .filter((row) => !this.isSoftDeleted(row))
      .forEach((row) => {
        const createdAt = this.parseDate(row.created_at ?? row.createdAt);
        if (!createdAt || createdAt.getTime() < start.getTime()) {
          return;
        }

        const source =
          String(row.source || '').trim() || 'Unknown';
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

    const total = [...sourceCounts.values()].reduce((sum, count) => sum + count, 0);
    if (total <= 0) {
      return [];
    }

    return [...sourceCounts.entries()]
      .map(([name, count]) => ({
        name,
        value: Number(((count * 100) / total).toFixed(1)),
      }))
      .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name));
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
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
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
        return this.getStatsFallback(period);
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
            SELECT COUNT(*)
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
            SELECT COUNT(*)
            FROM ${this.tables.leads} l
            WHERE l.next_followup_date IS NOT NULL
              AND l.next_followup_date <= CURRENT_DATE
              AND COALESCE(l.status, '') IN (?)
              ${leadSoftDeleteClause}
          ) AS pending_calls,
          (
            SELECT COUNT(*)
            FROM ${this.tables.bookings} b
            WHERE b.created_at >= ${periodStartSql}
          ) AS bookings
      `;

      const previousQuery = `
        SELECT
          (
            SELECT COUNT(*)
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
            SELECT COUNT(*)
            FROM ${this.tables.leads} l
            WHERE l.next_followup_date IS NOT NULL
              AND l.next_followup_date < ${periodStartSql}
              AND COALESCE(l.status, '') IN (?)
              ${leadSoftDeleteClause}
          ) AS pending_calls,
          (
            SELECT COUNT(*)
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
      return this.getStatsFallback(period);
    }
  }

  async getRevenue(range = 'week') {
    try {
      if (!this.canUseRawQuery()) {
        return this.getRevenueFallback(range);
      }

      const normalizedRange = this.normalizeRange(range);
      const bookingRevenueExpression = `COALESCE(b.total_amount, 0)`;
      const bookingSoftDeleteClause = await this.getSoftDeleteClause(
        this.tables.bookings,
        'b',
      );

      const bookedRevenueWhere = `COALESCE(b.status, '') <> 'CANCELLED'${bookingSoftDeleteClause}`;

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
      return this.getRevenueFallback(range);
    }
  }

  async getLeadSources(period = 'month') {
    try {
      if (!this.canUseRawQuery()) {
        return this.getLeadSourcesFallback(period);
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
            COUNT(*) AS source_count
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
      return this.getLeadSourcesFallback(period);
    }
  }
}

function createDashboardRepository(dependencies) {
  return new DashboardRepository(dependencies);
}

export { DashboardRepository, createDashboardRepository };

