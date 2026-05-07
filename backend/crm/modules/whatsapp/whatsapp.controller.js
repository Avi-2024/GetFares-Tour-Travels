function createWhatsappController({ service }) {
  return Object.freeze({
    async configStatus(_req, res) {
      const result = await service.getConfigStatus();
      res.status(200).json({ data: result });
    },

    async verify(req, res) {
      const challenge = await service.verifyWebhook(
        req.validated?.query ?? req.query,
      );
      res.status(200).send(challenge);
    },

    async receive(req, res) {
      const signature = req.headers["x-hub-signature-256"];
      const summary = await service.handleWebhook(
        req.validated?.body ?? req.body,
        {
          requestId: req.context?.requestId || null,
          rawBody: req.rawBody,
        },
        signature,
      );
      res.status(200).json({ data: summary });
    },

    async sendText(req, res) {
      const result = await service.sendTextMessage(req.validated.body, req.context);
      res.status(200).json({ data: result });
    },

    async listConversationMessages(req, res) {
      const { leadId } = req.validated.params;
      const region = req.validated.query?.region;
      const result = await service.listConversationMessages({ leadId, region });
      res.status(200).json({ data: result });
    },

    async listThreads(req, res) {
      const q = req.validated.query;
      const result = await service.listConversationThreads({
        page: q?.page,
        limit: q?.limit,
        q: q?.q,
        region: q?.region,
      });
      res.status(200).json({ data: result });
    },

    async sendTemplate(req, res) {
      const result = await service.sendTemplateMessage(
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createWhatsappController };
