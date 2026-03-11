function createWebhooksController({ service }) {
  return Object.freeze({
    async metaLeads(req, res) {
      const result = await service.captureMetaLead(req.validated.body);
      res.status(result.duplicate ? 200 : 201).json({ data: result });
    },

    async websiteEnquiry(req, res) {
      const result = await service.captureWebsiteEnquiry(req.validated.body);
      res.status(result.duplicate ? 200 : 201).json({ data: result });
    },

    async whatsappEnquiry(req, res) {
      const result = await service.captureWhatsappEnquiry(req.validated.body);
      res.status(result.duplicate ? 200 : 201).json({ data: result });
    },
  });
}

module.exports = { createWebhooksController };
