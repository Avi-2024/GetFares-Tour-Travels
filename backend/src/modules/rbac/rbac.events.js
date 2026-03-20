function createRbacEvents({ eventBus, logger }) {
  return Object.freeze({
    emitRoleAssigned(payload) {
      logger.info(
        { userId: payload.userId, role: payload.role },
        "rbac.role_assigned",
      );
      eventBus.emit("rbac.role_assigned", payload);
    },
    emitRolePermissionsUpdated(payload) {
      logger.info(
        { role: payload.role, permissionsCount: payload.permissions?.length || 0 },
        "rbac.role_permissions_updated",
      );
      eventBus.emit("rbac.role_permissions_updated", payload);
    },
    emitPermissionCreated(payload) {
      logger.info({ permissionId: payload?.id, key: payload?.key }, "rbac.permission_created");
      eventBus.emit("rbac.permission_created", payload);
    },
    emitPermissionUpdated(payload) {
      logger.info({ permissionId: payload?.id, key: payload?.key }, "rbac.permission_updated");
      eventBus.emit("rbac.permission_updated", payload);
    },
  });
}

export { createRbacEvents };
