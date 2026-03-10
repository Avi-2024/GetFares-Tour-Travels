function createReportsController({ service }) {
  return Object.freeze({
    async leadsBySource(req, res) {
      const result = await service.leadsBySource(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async leadsByConsultant(req, res) {
      const result = await service.leadsByConsultant(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async leadAging(req, res) {
      const result = await service.leadAging(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async lostLeads(req, res) {
      const result = await service.lostLeads(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async revenueByMonth(req, res) {
      const result = await service.revenueByMonth(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async revenueByServiceType(req, res) {
      const result = await service.revenueByServiceType(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async revenueByDestination(req, res) {
      const result = await service.revenueByDestination(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async targetVsAchievement(req, res) {
      const result = await service.targetVsAchievement(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async outstandingPayments(req, res) {
      const result = await service.outstandingPayments(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async paymentMode(req, res) {
      const result = await service.paymentMode(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async profitMargin(req, res) {
      const result = await service.profitMargin(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async visaSummary(req, res) {
      const result = await service.visaSummary(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async followupsToday(req, res) {
      const result = await service.followupsToday(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async followupsMissed(req, res) {
      const result = await service.followupsMissed(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async callLog(req, res) {
      const result = await service.callLog(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async monthlySummary(req, res) {
      const result = await service.monthlySummary(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async executiveKpis(req, res) {
      const result = await service.executiveKpis(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async conversionFunnel(req, res) {
      const result = await service.conversionFunnel(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async marketingPerformance(req, res) {
      const result = await service.marketingPerformance(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async supplierPerformance(req, res) {
      const result = await service.supplierPerformance(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async pipelineForecast(req, res) {
      const result = await service.pipelineForecast(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createReportsController };
