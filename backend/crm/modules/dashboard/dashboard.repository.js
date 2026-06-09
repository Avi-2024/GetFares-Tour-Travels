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

  parseReferenceDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  parseDateOnly(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const date = new Date(`${raw}T00:00:00`);
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

  getBookingLeadId(row, quoteLeadMap = new Map()) {
    const directLeadId = row?.lead_id ?? row?.leadId ?? null;
    if (directLeadId) return directLeadId;
    const quotationId = row?.quotation_id ?? row?.quotationId ?? null;
    return quotationId ? quoteLeadMap.get(String(quotationId)) || null : null;
  }

  getBookingCurrency(row, leadCurrencyMap = new Map(), quoteLeadMap = new Map()) {
    const leadId = this.getBookingLeadId(row, quoteLeadMap);
    const leadCurrency = leadId ? leadCurrencyMap.get(String(leadId)) : null;
    return this.normalizeCurrency(
      leadCurrency ??
        row?.lead_currency ??
        row?.leadCurrency ??
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

  async sumBucketRevenueInBase(
    rows,
    predicate,
    baseCurrency,
    leadCurrencyMap = new Map(),
    quoteLeadMap = new Map(),
  ) {
    const byCurrency = new Map();
    rows.forEach((row) => {
      if (!predicate(row)) return;
      const currency = this.getBookingCurrency(row, leadCurrencyMap, quoteLeadMap);
      const amount = this.getRevenueFromBooking(row);
      byCurrency.set(currency, (byCurrency.get(currency) || 0) + amount);
    });

    let total = 0;
    for (const [currency, sum] of byCurrency.entries()) {
      total += await this.convertSumToBase(sum, currency, baseCurrency);
    }
    return total;
  }

  buildQuotationLeadMap(quotations = []) {
    const map = new Map();
    (Array.isArray(quotations) ? quotations : []).forEach((row) => {
      const id = row?.id;
      const leadId = row?.lead_id ?? row?.leadId ?? null;
      if (id && leadId) {
        map.set(String(id), String(leadId));
      }
    });
    return map;
  }

  buildLeadCurrencyMap(leads = []) {
    const map = new Map();
    (Array.isArray(leads) ? leads : []).forEach((row) => {
      const id = row?.id;
      if (!id) return;
      const currency = this.normalizeCurrency(
        row?.client_currency ??
          row?.clientCurrency ??
          row?.currency ??
          "AED",
        "AED",
      );
      map.set(String(id), currency);
    });
    return map;
  }

  leadCountryAliases(value) {
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

  leadMatchesCountry(row, filters = {}) {
    const scope = String(filters.country || filters.market || filters.region || "").trim();
    if (!scope || scope.toUpperCase() === "ALL") return true;
    const aliases = new Set(this.leadCountryAliases(scope));
    const country = String(row?.lead_country ?? row?.leadCountry ?? "")
      .trim()
      .toLowerCase();
    return aliases.has(country);
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

  getCustomDateBounds(filters = {}) {
    const rawFrom = this.parseDateOnly(filters.from);
    const rawTo = this.parseDateOnly(filters.to);
    if (!rawFrom || !rawTo) return null;

    const start = rawFrom <= rawTo ? rawFrom : rawTo;
    const endInclusive = rawFrom <= rawTo ? rawTo : rawFrom;
    const end = this.shiftPeriod('day', endInclusive, 1);
    const days = Math.max(
      Math.round((end.getTime() - start.getTime()) / 86400000),
      1,
    );
    const previousEnd = new Date(start);
    const previousStart = this.shiftPeriod('day', previousEnd, -days);

    return {
      currentStart: start,
      currentEnd: end,
      previousStart,
      previousEnd,
      reference: endInclusive,
    };
  }

  async getStatsFallback(period = 'month', filters = {}) {
    const normalizedPeriod = this.normalizePeriod(period);
    const customBounds = this.getCustomDateBounds(filters);
    const now =
      customBounds?.reference ||
      this.parseReferenceDate(filters.to || filters.from || filters.date) ||
      new Date();
    const currentStart =
      customBounds?.currentStart || this.getPeriodBoundary(normalizedPeriod, now);
    const previousStart =
      customBounds?.previousStart || this.shiftPeriod(normalizedPeriod, currentStart, -1);
    const currentEnd =
      customBounds?.currentEnd || this.shiftPeriod(normalizedPeriod, currentStart, 1);

    const [leads, quotations, bookings] = await Promise.all([
      this.db.findMany(this.tables.leads, {}),
      this.db.findMany(this.tables.quotations, {}),
      this.db.findMany(this.tables.bookings, {}),
    ]);

    const leadRows = (Array.isArray(leads) ? leads : []).filter(
      (row) => !this.isSoftDeleted(row) && this.leadMatchesCountry(row, filters),
    );
    const scopedLeadIds = new Set(leadRows.map((row) => String(row?.id)).filter(Boolean));
    const quotationRows = (Array.isArray(quotations) ? quotations : []).filter(
      (row) =>
        !this.isSoftDeleted(row) &&
        (!scopedLeadIds.size ||
          scopedLeadIds.has(String(row?.lead_id ?? row?.leadId ?? ""))),
    );
    const quoteLeadMap = this.buildQuotationLeadMap(quotationRows);
    const bookingRows = (Array.isArray(bookings) ? bookings : []).filter((row) => {
      const leadId = this.getBookingLeadId(row, quoteLeadMap);
      return !scopedLeadIds.size || (leadId && scopedLeadIds.has(String(leadId)));
    });
    const leadCurrencyMap = this.buildLeadCurrencyMap(leadRows);
    const targetCurrency = this.normalizeCurrency(filters.currency || "USD", "USD");

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

    const activeBookingRows = bookingRows.filter(
      (row) => String(row.status || '').toUpperCase() !== 'CANCELLED',
    );

    const currentRevenue = await this.sumBucketRevenueInBase(
      activeBookingRows,
      (row) =>
        inWindow(
          this.parseDate(
            row.created_at ??
              row.createdAt ??
              row.travel_start_date ??
              row.travelStartDate,
          ),
          currentStart,
          currentEnd,
        ),
      targetCurrency,
      leadCurrencyMap,
      quoteLeadMap,
    );

    const previousRevenue = await this.sumBucketRevenueInBase(
      activeBookingRows,
      (row) =>
        inWindow(
          this.parseDate(
            row.created_at ??
              row.createdAt ??
              row.travel_start_date ??
              row.travelStartDate,
          ),
          previousStart,
          currentStart,
        ),
      targetCurrency,
      leadCurrencyMap,
      quoteLeadMap,
    );

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
        currency: targetCurrency,
        pendingCalls: pendingCallCount(leadRows, currentStart, currentEnd, false),
        bookings: currentBookings,
      },
      previous: {
        totalLeads: previousLeads,
        revenue: Number(previousRevenue.toFixed(2)),
        currency: targetCurrency,
        pendingCalls: pendingCallCount(leadRows, previousStart, currentStart, true),
        bookings: previousBookings,
      },
    };
  }

  async getRevenueFallback(range = 'week', currency, filters = {}) {
    const normalizedRange = this.normalizeRange(range);
    const [leads, quotations, bookings] = await Promise.all([
      this.db.findMany(this.tables.leads, {}),
      this.db.findMany(this.tables.quotations, {}),
      this.db.findMany(this.tables.bookings, {}),
    ]);
    const leadRows = (Array.isArray(leads) ? leads : []).filter(
      (row) => !this.isSoftDeleted(row) && this.leadMatchesCountry(row, filters),
    );
    const scopedLeadIds = new Set(leadRows.map((row) => String(row?.id)).filter(Boolean));
    const quoteRows = (Array.isArray(quotations) ? quotations : []).filter(
      (row) =>
        !this.isSoftDeleted(row) &&
        (!scopedLeadIds.size ||
          scopedLeadIds.has(String(row?.lead_id ?? row?.leadId ?? ""))),
    );
    const leadCurrencyMap = this.buildLeadCurrencyMap(leadRows);
    const quoteLeadMap = this.buildQuotationLeadMap(quoteRows);
    const rows = (Array.isArray(bookings) ? bookings : []).filter((row) => {
      const status = String(row?.status || 'PENDING').trim().toUpperCase();
      const leadId = this.getBookingLeadId(row, quoteLeadMap);
      const matchesLead =
        !scopedLeadIds.size || (leadId && scopedLeadIds.has(String(leadId)));
      return status !== 'CANCELLED' && !this.isSoftDeleted(row) && matchesLead;
    });
    const targetCurrency = this.normalizeCurrency(
      currency || "USD",
      "USD",
    );

    const customBounds = this.getCustomDateBounds(filters);
    const now =
      customBounds?.reference ||
      this.parseReferenceDate(filters.to || filters.from || filters.date) ||
      new Date();
    const buckets = [];
    const customRangeDays = customBounds
      ? Math.max(
          Math.round(
            (customBounds.currentEnd.getTime() - customBounds.currentStart.getTime()) /
              86400000,
          ),
          1,
        )
      : 0;

    if (customBounds) {
      const pushCustomBucket = (start, end, index) => {
        buckets.push({
          start,
          end,
          prevStart: this.shiftPeriod('day', start, -customRangeDays),
          prevEnd: this.shiftPeriod('day', end, -customRangeDays),
          index,
        });
      };

      if (normalizedRange === 'today' && customRangeDays === 1) {
        for (let index = 0; index < 24; index += 1) {
          const start = new Date(
            customBounds.currentStart.getTime() + index * 60 * 60 * 1000,
          );
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          pushCustomBucket(start, end, index);
        }
      } else if (normalizedRange === 'year') {
        let cursor = new Date(
          customBounds.currentStart.getFullYear(),
          customBounds.currentStart.getMonth(),
          1,
        );
        let index = 0;
        while (cursor.getTime() < customBounds.currentEnd.getTime()) {
          const start = new Date(cursor);
          const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
          pushCustomBucket(start, end, index);
          cursor = end;
          index += 1;
        }
      } else {
        const stepDays = normalizedRange === 'month' ? 7 : 1;
        let cursor = new Date(customBounds.currentStart);
        let index = 0;
        while (cursor.getTime() < customBounds.currentEnd.getTime()) {
          const start = new Date(cursor);
          const end = this.shiftPeriod('day', start, stepDays);
          pushCustomBucket(
            start,
            end.getTime() > customBounds.currentEnd.getTime()
              ? new Date(customBounds.currentEnd)
              : end,
            index,
          );
          cursor = end;
          index += 1;
        }
      }
    } else if (normalizedRange === 'today') {
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

    const getBookingDate = (row) =>
      this.parseDate(
        row?.created_at ??
          row?.createdAt ??
          row?.travel_start_date ??
          row?.travelStartDate ??
          row?.date,
      );

    const results = [];
    for (const bucket of buckets) {
      const revenue = await this.sumBucketRevenueInBase(
        rows,
        (row) => {
          const created = getBookingDate(row);
          return (
            created &&
            created.getTime() >= bucket.start.getTime() &&
            created.getTime() < bucket.end.getTime()
          );
        },
        targetCurrency,
        leadCurrencyMap,
        quoteLeadMap,
      );

      const last = await this.sumBucketRevenueInBase(
        rows,
        (row) => {
          const created = getBookingDate(row);
          return (
            created &&
            created.getTime() >= bucket.prevStart.getTime() &&
            created.getTime() < bucket.prevEnd.getTime()
          );
        },
        targetCurrency,
        leadCurrencyMap,
        quoteLeadMap,
      );

      results.push({
        name:
          customBounds && !(normalizedRange === 'today' && customRangeDays === 1)
            ? bucket.start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : this.bucketLabel(bucket.start, normalizedRange, bucket.index),
        revenue: this.roundAmount(revenue),
        last: this.roundAmount(last),
        currency: targetCurrency,
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

  async getStats(period = 'month', filters = {}) {
    return this.getStatsFallback(period, filters);
  }

  async getRevenue(range = 'week', currency, filters = {}) {
    return this.getRevenueFallback(range, currency, filters);
  }

  async getLeadSources(period = 'month') {
    return this.getLeadSourcesFallback(period);
  }
}

function createDashboardRepository(dependencies) {
  return new DashboardRepository(dependencies);
}

export { DashboardRepository, createDashboardRepository };

