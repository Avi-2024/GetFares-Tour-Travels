function createReportsService({ repository, logger }) {
  return Object.freeze({
    async leadsBySource(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Lead source report');
      return repository.getLeadsBySource(filters);
    },

    async leadsByConsultant(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Lead consultant report');
      return repository.getLeadsByConsultant(filters);
    },

    async leadAging(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Lead aging report');
      return repository.getLeadAgingReport(filters);
    },

    async lostLeads(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Lost leads report');
      return repository.getLostLeadReport(filters);
    },

    async revenueByMonth(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Revenue by month report');
      return repository.getRevenueByMonth(filters);
    },

    async revenueByServiceType(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Revenue by service type report');
      return repository.getRevenueByServiceType(filters);
    },

    async revenueByDestination(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Revenue by destination report');
      return repository.getRevenueByDestination(filters);
    },

    async targetVsAchievement(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Target vs achievement report');
      return repository.getTargetVsAchievement(filters);
    },

    async outstandingPayments(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Outstanding payments report');
      return repository.getOutstandingPayments(filters);
    },

    async paymentMode(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Payment mode report');
      return repository.getPaymentModeReport(filters);
    },

    async profitMargin(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Profit margin report');
      return repository.getProfitMarginReport(filters);
    },

    async visaSummary(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Visa summary report');
      return repository.getVisaSummary(filters);
    },

    async followupsToday(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Today follow-ups report');
      return repository.getTodayFollowups(filters);
    },

    async followupsMissed(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Missed follow-ups report');
      return repository.getMissedFollowups(filters);
    },

    async monthlySummary(filters = {}, context = {}) {
      logger.debug({ module: 'reports', requestId: context.requestId, filters }, 'Monthly summary report');
      return repository.getMonthlySummary(filters);
    },
  });
}

module.exports = { createReportsService };
