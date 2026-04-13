function createLeadsController({ service }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async publicCapture(req, res) {
      // Debug logging
      req.logger?.info?.(
        { validated: req.validated?.body, raw: req.body },
        'publicCapture payload received'
      );
      
      const payload = {
        ...req.validated.body,
        source: req.validated.body.source || "website",
        status: req.validated.body.status || "OPEN",
      };
      const result = await service.create(payload, req.context);
      res.status(201).json({ data: result });
    },

    async update(req, res) {
      const result = await service.update(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async assign(req, res) {
      const result = await service.assignLead(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async distribute(req, res) {
      const result = await service.distributePending(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async reassignInactive(req, res) {
      const result = await service.reassignInactive(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createFollowup(req, res) {
      const result = await service.createFollowup(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async disableCalls(req, res) {
      const result = await service.disableCalls(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listFollowups(req, res) {
      const result = await service.listFollowups(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listOverdueFollowups(req, res) {
      const result = await service.listOverdueFollowups(
        req.validated.query || req.query,
      );
      res.status(200).json({ data: result });
    },

    async processOverdueFollowups(req, res) {
      const result = await service.processOverdueFollowups(
        req.validated.body || {},
      );
      res.status(200).json({ data: result });
    },

    async processSlaBreaches(req, res) {
      const result = await service.processSlaBreaches(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async processNonResponsive(req, res) {
      const result = await service.processNonResponsive(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async processCadenceAutomation(req, res) {
      const result = await service.processCadenceAutomation(
        req.validated.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createLeadActivity(req, res) {
      const b = req.validated?.body || req.body || {};
      console.log("RECEIVED:", b);
      if (!b.created_at) {
        return res.status(400).json({ error: "created_at missing" });
      }
      if (!b.timezone) {
        return res.status(400).json({ error: "timezone missing" });
      }
      await service.createLeadActivity(
        {
          lead_id: b.lead_id,
          notes: b.notes,
          created_at: b.created_at,
          timezone: b.timezone,
          activity_type: b.activity_type,
        },
        req.context,
      );
      res.status(201).json({ success: true });
    },

    async listLeadActivities(req, res) {
      const leadId = req.validated.query.lead_id;
      const data = await service.listLeadActivities(leadId, req.context);
      res.status(200).json({ data });
    },
  });
}

export { createLeadsController };
