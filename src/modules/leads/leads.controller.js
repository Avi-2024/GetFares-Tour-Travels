function createLeadsController({ service }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(req.validated?.query || req.query, req.context);
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(req.validated.params.id, req.context);
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

    async assign(req, res) {
      const result = await service.assignLead(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async distribute(req, res) {
      const result = await service.distributePending(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async reassignInactive(req, res) {
      const result = await service.reassignInactive(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async createFollowup(req, res) {
      const result = await service.createFollowup(req.validated.params.id, req.validated.body, req.context);
      res.status(201).json({ data: result });
    },

    async listOverdueFollowups(req, res) {
      const result = await service.listOverdueFollowups(req.validated.query || req.query);
      res.status(200).json({ data: result });
    },

    async processOverdueFollowups(req, res) {
      const result = await service.processOverdueFollowups(req.validated.body || {});
      res.status(200).json({ data: result });
    },

    async processSlaBreaches(req, res) {
      const result = await service.processSlaBreaches(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createLeadsController };
