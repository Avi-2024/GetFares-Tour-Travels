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
    this.currencyService = dependencies.currencyService || null;
    this.tables = {
      leads: 'leads',
      quotations: 'quotations',
      bookings: 'bookings',
      payments: 'payments',
    };
    this.columnCache = new Map();
  }

  canUseRawQuery() {
    return false;
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
        return 'CURRENT_DATE';
      case 'week':
        return "DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)";
      case 'year':
        return "DATE_FORMAT(CURRENT_DATE, '%Y-01-01')";
      case 'month':
      default:
        return "DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')";
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
    if (typeof value === 'number') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    }
    const raw = String(value).trim();
    // MySQL DATETIME often comes as "YYYY-MM-DD HH:mm:ss" (non-ISO). Normalize for stable parsing.
    const normalized =
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
        ? raw.replace(' ', 'T')
        : raw;
    const date = new Date(normalized);
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

  normalizeCurrency(value, fallback = "AED") {
    const normalized = String(value || "")
      .trim()
      .toUpperCase();
    return normalized || fallback;
  }

  getBookingCurrency(row) {
    return this.normalizeCurrency(
      row?.client_currency ??
        row?.clientCurrency ??
        row?.currency ??
        row?.supplier_currency ??
        row?.supplierCurrency ??
        "AED",
      "AED",
    );
  }

  getPaymentCurrency(row) {
    return this.normalizeCurrency(
      row?.currency ?? row?.client_currency ?? row?.clientCurrency ?? "AED",
      "AED",
    );
  }

  roundAmount(value) {
    return Number(this.toNumber(value, 0).toFixed(2));
  }

  async convertSumToBase(amount, fromCurrency, baseCurrency) {
    const normalizedBase = this.normalizeCurrency(baseCurrency, "AED");
    const normalizedFrom = this.normalizeCurrency(fromCurrency, normalizedBase);
    const amountNumber = this.toNumber(amount, 0);

    if (!amountNumber) return 0;
    if (
      !this.currencyService ||
      typeof this.currencyService.convert !== "function" ||
      normalizedFrom === normalizedBase
    ) {
      return amountNumber;
    }

    try {
      return await this.currencyService.convert(
        amountNumber,
        normalizedFrom,
        normalizedBase,
      );
    } catch (error) {
      this.log?.warn?.(
        {
          module: "dashboard",
          fromCurrency: normalizedFrom,
          baseCurrency: normalizedBase,
          error: error.message,
        },
        "Currency conversion failed for dashboard revenue bucket",
      );
      return amountNumber;
    }
  }

  async sumBucketRevenueInBase(rows, predicate, baseCurrency) {
    const byCurrency = new Map();
    rows.forEach((row) => {
      if (!predicate(row)) return;
      const currency = this.getBookingCurrency(row);
      const amount = this.getRevenueFromBooking(row);
      byCurrency.set(currency, (byCurrency.get(currency) || 0) + amount);
    });

    let total = 0;
    for (const [currency, sum] of byCurrency.entries()) {
      total += await this.convertSumToBase(sum, currency, baseCurrency);
    }
    return total;
  }

  async sumBucketPaymentsInBase(rows, predicate, baseCurrency) {
    const byCurrency = new Map();
    rows.forEach((row) => {
      if (!predicate(row)) return;
      const currency = this.getPaymentCurrency(row);
      const amount = this.toNumber(row?.amount ?? 0, 0);
      if (!amount) return;
      byCurrency.set(currency, (byCurrency.get(currency) || 0) + amount);
    });

    let total = 0;
    for (const [currency, sum] of byCurrency.entries()) {
      total += await this.convertSumToBase(sum, currency, baseCurrency);
    }
    return total;
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
    const payments = await this.db.findMany(this.tables.payments, {});
    const toBoolean = (value, fallback = false) => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value === 1;
      const normalized = String(value).trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n'].includes(normalized)) return false;
      return Boolean(value);
    };
    const rows = (Array.isArray(payments) ? payments : []).filter((row) => {
      const status = String(row?.status || 'PENDING').trim().toUpperCase();
      const isVerified = toBoolean(row?.is_verified ?? row?.isVerified, false);
      // Match finance stats: verified payments excluding refunded.
      return isVerified && status !== 'REFUNDED' && !this.isSoftDeleted(row);
    });
    const baseCurrency = this.normalizeCurrency(
      this.currencyService?.baseCurrency || "AED",
      "AED",
    );

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

    const getCreatedAt = (row) =>
      this.parseDate(
        row?.paid_at ??
          row?.paidAt ??
          row?.date ??
          row?.created_at ??
          row?.createdAt,
      );

    const results = [];
    for (const bucket of buckets) {
      const revenue = await this.sumBucketPaymentsInBase(
        rows,
        (row) => {
          const created = getCreatedAt(row);
          return (
            created &&
            created.getTime() >= bucket.start.getTime() &&
            created.getTime() < bucket.end.getTime()
          );
        },
        baseCurrency,
      );

      const last = await this.sumBucketPaymentsInBase(
        rows,
        (row) => {
          const created = getCreatedAt(row);
          return (
            created &&
            created.getTime() >= bucket.prevStart.getTime() &&
            created.getTime() < bucket.prevEnd.getTime()
          );
        },
        baseCurrency,
      );

      results.push({
        name: this.bucketLabel(bucket.start, normalizedRange, bucket.index),
        revenue: this.roundAmount(revenue),
        last: this.roundAmount(last),
        currency: baseCurrency,
      });
    }

    return results;
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
    return this.getStatsFallback(period);
  }

  async getRevenue(range = 'week') {
    return this.getRevenueFallback(range);
  }

  async getLeadSources(period = 'month') {
    return this.getLeadSourcesFallback(period);
  }
}

function createDashboardRepository(dependencies) {
  return new DashboardRepository(dependencies);
}

export { DashboardRepository, createDashboardRepository };

