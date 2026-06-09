import { logger } from '../../core/logger/index.js';

class DashboardService {
  constructor(repository, reportsService) {
    this.repository = repository;
    this.reportsService = reportsService;
  }

  normalizePeriod(period = 'month') {
    const normalized = String(period).toLowerCase();
    if (normalized === 'today' || normalized === 'day') return 'day';
    if (normalized === 'week') return 'week';
    if (normalized === 'year') return 'year';
    return 'month';
  }

  parseReferenceDate(value) {
    if (!value) return new Date();
    const raw = String(value).trim();
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  formatDateOnly(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  parseDateOnly(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  getWindowRange(period = 'month', filters = {}) {
    const customFrom = this.parseDateOnly(filters.from);
    const customTo = this.parseDateOnly(filters.to);

    if (customFrom && customTo) {
      const start = customFrom <= customTo ? customFrom : customTo;
      const end = customFrom <= customTo ? customTo : customFrom;
      const days = Math.max(
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
        1,
      );
      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - days + 1);

      return {
        current: {
          from: this.formatDateOnly(start),
          to: this.formatDateOnly(end),
        },
        previous: {
          from: this.formatDateOnly(previousStart),
          to: this.formatDateOnly(previousEnd),
        },
      };
    }

    const now = this.parseReferenceDate(filters.to || filters.from || filters.date);
    const end = new Date(now);
    const start = new Date(now);
    const normalized = this.normalizePeriod(period);

    if (normalized === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (normalized === 'week') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (normalized === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    const windowMs = Math.max(end.getTime() - start.getTime(), 1);
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - windowMs);

    return {
      current: {
        from: this.formatDateOnly(start),
        to: this.formatDateOnly(end),
      },
      previous: {
        from: this.formatDateOnly(previousStart),
        to: this.formatDateOnly(previousEnd),
      },
    };
  }

  calculateChange(current, previous) {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (!previousValue) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  getDashboardRevenueBuckets(range = 'week', filters = {}) {
    const normalized = this.normalizePeriod(range);
    const bounds = this.getWindowRange(normalized, filters).current;
    const start = this.parseDateOnly(bounds.from);
    const end = this.parseDateOnly(bounds.to);

    if (!start || !end) {
      return [];
    }

    const buckets = [];
    const pushBucket = (bucketStart, bucketEnd, label) => {
      const safeEnd = bucketEnd > end ? new Date(end) : bucketEnd;
      if (bucketStart > end || safeEnd < start) return;

      buckets.push({
        label,
        from: this.formatDateOnly(bucketStart),
        to: this.formatDateOnly(safeEnd),
      });
    };

    if (normalized === 'day') {
      pushBucket(start, end, start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }));
      return buckets;
    }

    if (normalized === 'week') {
      let cursor = new Date(start);
      const showDateLabels =
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1 > 7;
      while (cursor <= end) {
        pushBucket(
          new Date(cursor),
          new Date(cursor),
          cursor.toLocaleDateString(
            'en-US',
            showDateLabels
              ? { month: 'short', day: 'numeric' }
              : { weekday: 'short' },
          ),
        );
        cursor = this.addDays(cursor, 1);
      }
      return buckets;
    }

    if (normalized === 'month') {
      let cursor = new Date(start);
      let index = 1;
      while (cursor <= end) {
        const bucketStart = new Date(cursor);
        const bucketEnd = this.addDays(bucketStart, 6);
        pushBucket(bucketStart, bucketEnd, `W${index}`);
        cursor = this.addDays(bucketEnd, 1);
        index += 1;
      }
      return buckets;
    }

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const bucketStart = cursor < start ? new Date(start) : new Date(cursor);
      const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      pushBucket(
        bucketStart,
        bucketEnd,
        cursor.toLocaleDateString('en-US', { month: 'short' }),
      );
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return buckets;
  }

  async getStats(period = 'month', filters = {}) {
    try {
      if (this.reportsService?.executiveKpis) {
        const ranges = this.getWindowRange(period, filters);
        const currency = String(filters.currency || 'AED').trim().toUpperCase();
        const scopedFilters = {
          ...filters,
          currency,
        };
        const [current, previous] = await Promise.all([
          this.reportsService.executiveKpis(
            { ...scopedFilters, ...ranges.current },
            {},
          ),
          this.reportsService.executiveKpis(
            { ...scopedFilters, ...ranges.previous },
            {},
          ),
        ]);

        const currentStats = current || {};
        const previousStats = previous || {};

        const currentPendingCalls =
          Number(currentStats.pendingFollowups || 0) +
          Number(currentStats.overdueFollowups || 0);
        const previousPendingCalls =
          Number(previousStats.pendingFollowups || 0) +
          Number(previousStats.overdueFollowups || 0);

        return {
          totalLeads: Number(currentStats.totalLeads || 0),
          totalLeadsChange: this.calculateChange(
            currentStats.totalLeads,
            previousStats.totalLeads,
          ),
          revenue: Number(currentStats.revenue || 0),
          currency: currentStats.currency || currency,
          revenueChange: this.calculateChange(
            currentStats.revenue,
            previousStats.revenue,
          ),
          pendingCalls: currentPendingCalls,
          pendingCallsChange: this.calculateChange(
            currentPendingCalls,
            previousPendingCalls,
          ),
          bookings: Number(currentStats.totalBookings || 0),
          bookingsChange: this.calculateChange(
            currentStats.totalBookings,
            previousStats.totalBookings,
          ),
          source: 'executive_kpis_adapter',
        };
      }

      const stats = await this.repository.getStats(period, filters);
      const currentPeriodStats = stats.current || {};
      const previousPeriodStats = stats.previous || {};

      return {
        totalLeads: currentPeriodStats.totalLeads || 0,
        totalLeadsChange: this.calculateChange(
          currentPeriodStats.totalLeads,
          previousPeriodStats.totalLeads,
        ),
        revenue: currentPeriodStats.revenue || 0,
        currency: currentPeriodStats.currency || 'AED',
        revenueChange: this.calculateChange(
          currentPeriodStats.revenue,
          previousPeriodStats.revenue,
        ),
        pendingCalls: currentPeriodStats.pendingCalls || 0,
        pendingCallsChange: this.calculateChange(
          currentPeriodStats.pendingCalls,
          previousPeriodStats.pendingCalls,
        ),
        bookings: currentPeriodStats.bookings || 0,
        bookingsChange: this.calculateChange(
          currentPeriodStats.bookings,
          previousPeriodStats.bookings,
        ),
        source: 'legacy_dashboard_repository',
      };
    } catch (error) {
      logger.error('Error in dashboard service getStats:', error);
      throw error;
    }
  }

  async getRevenue(range = 'week', currency, filters = {}) {
    try {
      if (this.reportsService?.executiveKpis) {
        const reportingCurrency = String(currency || filters.currency || 'AED')
          .trim()
          .toUpperCase();
        const scopedFilters = {
          ...filters,
          currency: reportingCurrency,
        };
        const buckets = this.getDashboardRevenueBuckets(range, scopedFilters);

        return Promise.all(
          buckets.map(async (bucket) => {
            const current = await this.reportsService.executiveKpis(
              {
                ...scopedFilters,
                from: bucket.from,
                to: bucket.to,
              },
              {},
            );

            return {
              name: bucket.label,
              revenue: Number(Number(current?.revenue || 0).toFixed(2)),
              currency: current?.currency || reportingCurrency,
            };
          }),
        );
      }

      const revenueData = await this.repository.getRevenue(range, currency, filters);
      return revenueData;
    } catch (error) {
      logger.error('Error in dashboard service getRevenue:', error);
      throw error;
    }
  }

  async getLeadSources(period = 'month') {
    try {
      const leadSources = await this.repository.getLeadSources(period);
      return leadSources;
    } catch (error) {
      logger.error('Error in dashboard service getLeadSources:', error);
      throw error;
    }
  }
}

function createDashboardService(repository, reportsService) {
  return new DashboardService(repository, reportsService);
}

export { DashboardService, createDashboardService };
