function createPushController({ service }) {
  return Object.freeze({
    async listMine(req, res) {
      const result = await service.listMine(req.context);
      res.status(200).json({ data: result });
    },

    async publicKey(_req, res) {
      const result = await service.getPublicKey();
      res.status(200).json({ data: result });
    },

    async subscribe(req, res) {
      const result = await service.subscribe(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },

    async unsubscribe(req, res) {
      const result = await service.unsubscribe(req.validated.body || {}, req.context);
      res.status(200).json({ data: result });
    },
  });
}

export { createPushController };

