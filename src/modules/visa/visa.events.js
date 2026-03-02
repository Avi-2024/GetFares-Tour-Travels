function createVisaEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'visa.created');
      eventBus.emit('visa.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'visa.updated');
      eventBus.emit('visa.updated', payload);
    },
  });
}

module.exports = { createVisaEvents };
