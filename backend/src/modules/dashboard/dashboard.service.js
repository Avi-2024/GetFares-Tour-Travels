import { logger } from '../../core/logger/index.js';

class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  async getStats(period = 'month') {
    try {
      const stats = await this.repository.getStats(period);
      
      // Calculate percentage changes
      const currentPeriodStats = stats.current || {};
      const previousPeriodStats = stats.previous || {};
      
      const calculateChange = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100);
      };
      
      return {
        totalLeads: currentPeriodStats.totalLeads || 0,
        totalLeadsChange: calculateChange(
          currentPeriodStats.totalLeads,
          previousPeriodStats.totalLeads
        ),
        revenue: currentPeriodStats.revenue || 0,
        revenueChange: calculateChange(
          currentPeriodStats.revenue,
          previousPeriodStats.revenue
        ),
        pendingCalls: currentPeriodStats.pendingCalls || 0,
        pendingCallsChange: calculateChange(
          currentPeriodStats.pendingCalls,
          previousPeriodStats.pendingCalls
        ),
        bookings: currentPeriodStats.bookings || 0,
        bookingsChange: calculateChange(
          currentPeriodStats.bookings,
          previousPeriodStats.bookings
        )
      };
    } catch (error) {
      logger.error('Error in dashboard service getStats:', error);
      throw error;
    }
  }

  async getRevenue(range = 'week') {
    try {
      const revenueData = await this.repository.getRevenue(range);
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

function createDashboardService(repository) {
  return new DashboardService(repository);
}

export { DashboardService, createDashboardService };