function createDestinationsController({ service }) {
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
        { includePricing: true },
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createDestination(req, res) {
      const result = await service.createDestination(
        req.validated.body,
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async updateDestination(req, res) {
      const result = await service.updateDestination(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listPricing(req, res) {
      const result = await service.listPricing(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async createPricing(req, res) {
      const result = await service.createPricing(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async updatePricing(req, res) {
      const result = await service.updatePricing(
        req.validated.params.pricingId,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createDestinationsController };
