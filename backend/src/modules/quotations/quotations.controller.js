function createQuotationsController({ service }) {
  function extractIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (Array.isArray(forwarded) && forwarded.length) {
      return forwarded[0];
    }

    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    return req.ip || null;
  }

  return Object.freeze({
    async list(req, res) {
      const result = await service.list(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(req.validated.params.id, req.context, { includeItems: true });
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const result = await service.update(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async generatePdf(req, res) {
      const result = await service.generatePdf(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async send(req, res) {
      const result = await service.send(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async trackView(req, res) {
      const result = await service.trackView(
        req.validated.params.id,
        {
          ...(req.validated.body || {}),
          ipAddress: extractIp(req),
          userAgent: req.headers['user-agent'] || null,
        },
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async approveMargin(req, res) {
      const result = await service.approveMargin(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async transitionStatus(req, res) {
      const result = await service.transitionStatus(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async listViews(req, res) {
      const result = await service.listViews(
        req.validated.params.id,
        req.validated.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listVersions(req, res) {
      const result = await service.listVersions(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async listSendLogs(req, res) {
      const result = await service.listSendLogs(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async runReminders(req, res) {
      const result = await service.runReminderAutomation(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async leadToQuoteReport(req, res) {
      const result = await service.getLeadToQuoteReport(req.validated.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async listTemplates(req, res) {
      const result = await service.listTemplates(req.validated?.query || req.query);
      res.status(200).json({ data: result });
    },

    async createTemplate(req, res) {
      const result = await service.createTemplate(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async updateTemplate(req, res) {
      const result = await service.updateTemplate(req.validated.params.id, req.validated.body, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createQuotationsController };
