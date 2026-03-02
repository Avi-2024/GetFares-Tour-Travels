function createPaymentsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'payments.created');
      eventBus.emit('payments.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'payments.updated');
      eventBus.emit('payments.updated', payload);
    },
  });
}

module.exports = { createPaymentsEvents };
