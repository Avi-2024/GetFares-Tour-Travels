function createRbacController({ service }) {
  return Object.freeze({
    async assignRole(req, res) {
      const result = await service.assignRole(req.validated.body);
      res.status(200).json({ data: result });
    },

    async listPermissions(req, res) {
      const result = await service.listPermissions(req.validated?.query || req.query);
      res.status(200).json({ data: result });
    },

    async createPermission(req, res) {
      const result = await service.createPermission(req.validated.body);
      res.status(201).json({ data: result });
    },

    async updatePermission(req, res) {
      const result = await service.updatePermission(
        req.validated.params.id,
        req.validated.body,
      );
      res.status(200).json({ data: result });
    },

    async listRoles(req, res) {
      const result = await service.listRoles(req.validated?.query || req.query);
      res.status(200).json({ data: result });
    },

    async createRole(req, res) {
      const result = await service.createRole(req.validated.body);
      res.status(201).json({ data: result });
    },

    async updateRole(req, res) {
      const result = await service.updateRole(
        req.validated.params.id,
        req.validated.body,
      );
      res.status(200).json({ data: result });
    },

    async updateRolePermissions(req, res) {
      const result = await service.updateRolePermissionsById({
        roleId: req.validated.params.id,
        permissions: req.validated.body.permissions,
        permissionIds: req.validated.body.permissionIds,
        replace: req.validated.body.replace,
      });
      res.status(200).json({ data: result });
    },

    async getRolePermissionsById(req, res) {
      const result = await service.getRolePermissionsById(req.validated.params.id);
      res.status(200).json({ data: result });
    },

    async getRolePermissions(req, res) {
      const result = await service.getRolePermissions(req.validated.params.role);
      res.status(200).json({ data: result });
    },

    async setRolePermissions(req, res) {
      const result = await service.setRolePermissions({
        role: req.validated.params.role,
        permissions: req.validated.body.permissions,
      });
      res.status(200).json({ data: result });
    },

    async myPermissions(req, res) {
      const result = await service.getPermissionsForUser(req.context.user);
      res.status(200).json({ data: result });
    },
  });
}

export { createRbacController };
