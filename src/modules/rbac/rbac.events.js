function createRbacEvents({ eventBus, logger }) {
  return Object.freeze({
    emitRoleAssigned(payload) {
      logger.info({ userId: payload.userId, role: payload.role }, 'rbac.role_assigned');
      eventBus.emit('rbac.role_assigned', payload);
    },
  });
}

module.exports = { createRbacEvents };
