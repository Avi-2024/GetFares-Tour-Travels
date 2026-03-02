function createAuthEvents({ eventBus, logger }) {
  return Object.freeze({
    emitRegistered(payload) {
      logger.info({ userId: payload.id, email: payload.email }, 'auth.registered');
      eventBus.emit('auth.registered', payload);
    },
    emitLoggedIn(payload) {
      logger.info({ userId: payload.id, email: payload.email }, 'auth.logged_in');
      eventBus.emit('auth.logged_in', payload);
    },
  });
}

module.exports = { createAuthEvents };
