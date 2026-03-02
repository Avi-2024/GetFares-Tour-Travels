function createRefundsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'refunds.created');
      eventBus.emit('refunds.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'refunds.updated');
      eventBus.emit('refunds.updated', payload);
    },
  });
}

module.exports = { createRefundsEvents };
