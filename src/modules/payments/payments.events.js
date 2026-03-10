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
    emitVerified(payload) {
      logger.info({ id: payload.id, bookingId: payload.bookingId }, 'payments.verified');
      eventBus.emit('payments.verified', payload);
    },
  });
}

module.exports = { createPaymentsEvents };
