function createComplaintsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'complaints.created');
      eventBus.emit('complaints.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'complaints.updated');
      eventBus.emit('complaints.updated', payload);
    },
  });
}

module.exports = { createComplaintsEvents };
