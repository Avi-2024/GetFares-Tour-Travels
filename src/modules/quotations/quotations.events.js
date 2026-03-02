function createQuotationsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'quotations.created');
      eventBus.emit('quotations.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'quotations.updated');
      eventBus.emit('quotations.updated', payload);
    },
  });
}

module.exports = { createQuotationsEvents };
