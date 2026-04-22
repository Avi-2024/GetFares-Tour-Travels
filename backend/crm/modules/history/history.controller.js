function createHistoryController({ service }) {
  return Object.freeze({
    async create(req, res) {
      const { created_at, timezone } = req.validated.body;
      await service.create({ created_at, timezone });
      res.status(201).json({ success: true });
    },

    async list(req, res) {
      const limit = req.validated?.query?.limit;
      const data = await service.list({ limit });
      res.status(200).json({ data });
    },
  });
}

export { createHistoryController };
