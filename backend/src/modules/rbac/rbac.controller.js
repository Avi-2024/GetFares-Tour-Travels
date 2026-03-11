function createRbacController({ service }) {
  return Object.freeze({
    async assignRole(req, res) {
      const result = await service.assignRole(req.validated.body);
      res.status(200).json({ data: result });
    },

    async myPermissions(req, res) {
      const result = await service.getPermissionsForUser(req.context.user);
      res.status(200).json({ data: result });
    },
  });
}

module.exports = { createRbacController };
