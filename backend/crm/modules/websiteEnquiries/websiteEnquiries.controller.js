function createWebsiteEnquiriesController({ service }) {
  return Object.freeze({
    async capture(req, res) {
      const result = await service.capture(req.validated.body);
      res.status(result.duplicate ? 200 : 201).json({ data: result });
    },
  });
}

export { createWebsiteEnquiriesController };
