function createNotificationsController({ service }) {
  return Object.freeze({
    async listMine(req, res) {
      const result = await service.listMine(req.validated.query || {}, req.context);
      res.status(200).json({ data: result });
    },

    async unreadCount(req, res) {
      const result = await service.getUnreadCount(req.context);
      res.status(200).json({ data: result });
    },

    async markRead(req, res) {
      const result = await service.markRead(req.validated.params.id, req.context);
      res.status(200).json({ data: result });
    },

    async markAllRead(req, res) {
      const result = await service.markAllRead(req.context);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createNotificationsController };
