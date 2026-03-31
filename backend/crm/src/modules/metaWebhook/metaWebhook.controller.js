function createMetaWebhookController({ service }) {
  return Object.freeze({
    async verify(req, res) {
      const challenge = service.verifyWebhook(
        req.validated?.query ?? req.query,
      );
      res.status(200).send(challenge);
    },

    async receive(req, res) {
      const summary = await service.handleWebhook(
        req.validated?.body ?? req.body,
        { requestId: req.context?.requestId || null },
      );
      res.status(200).json({ data: summary });
    },
  });
}

export { createMetaWebhookController };
