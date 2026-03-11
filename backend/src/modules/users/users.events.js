function createUsersEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'users.created');
      eventBus.emit('users.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'users.updated');
      eventBus.emit('users.updated', payload);
    },
  });
}

module.exports = { createUsersEvents };
