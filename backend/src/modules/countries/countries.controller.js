function createCountriesController({ service }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(req.validated?.query || req.query);
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const includeUsage = req.validated?.query?.includeUsage === true;
      const result = await service.getById(req.validated.params.id, {
        includeUsage,
      });
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
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
  });
}

export { createCountriesController };
