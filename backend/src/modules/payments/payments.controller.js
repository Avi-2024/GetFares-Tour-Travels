function createPaymentsController({ service }) {
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

    async verify(req, res) {
      const result = await service.verify(req.validated.params.id, req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createPaymentsController };
