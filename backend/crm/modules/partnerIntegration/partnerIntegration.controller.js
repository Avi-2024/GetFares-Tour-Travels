function createPartnerIntegrationController({ service }) {
  return Object.freeze({
    health: async (req, res) =>
      res.status(200).json({
        success: true,
        data: {
          status: "ok",
          clientId: req.context.integration.id,
          clientName: req.context.integration.name,
        },
      }),
    changes: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.listChanges(req.validated.query || {}),
      }),
    customer: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.getCustomer(req.validated.params.id),
      }),
    lead: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.getLead(req.validated.params.id),
      }),
    booking: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.getBooking(req.validated.params.id),
      }),
    createWebhookEndpoint: async (req, res) =>
      res.status(201).json({
        success: true,
        data: await service.createWebhookEndpoint(
          req.context.integration.id,
          req.validated.body,
        ),
      }),
    listWebhookEndpoints: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.listWebhookEndpoints(req.context.integration.id),
      }),
    updateWebhookEndpoint: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.updateWebhookEndpoint(
          req.context.integration.id,
          req.validated.params.id,
          req.validated.body,
        ),
      }),
    testWebhookEndpoint: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.testWebhookEndpoint(
          req.context.integration.id,
          req.validated.params.id,
        ),
      }),
    listWebhookDeliveries: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.listWebhookDeliveries(
          req.context.integration.id,
          req.validated.query || {},
        ),
      }),
    retryWebhookDelivery: async (req, res) =>
      res.status(200).json({
        success: true,
        data: await service.retryWebhookDelivery(
          req.context.integration.id,
          req.validated.params.id,
        ),
      }),
    queueDiagnosticWebhook: async (req, res) =>
      res.status(202).json({
        success: true,
        data: await service.queueDiagnosticWebhook(req.context.integration.id),
      }),
  });
}

export { createPartnerIntegrationController };
