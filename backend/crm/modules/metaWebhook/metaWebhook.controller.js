function createMetaWebhookController({ service }) {
  return Object.freeze({
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
  });
}

export { createMetaWebhookController };
