function createCustomersEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'customers.created');
      eventBus.emit('customers.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'customers.updated');
      eventBus.emit('customers.updated', payload);
    },
  });
}

module.exports = { createCustomersEvents };
