function createBookingsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'bookings.created');
      eventBus.emit('bookings.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'bookings.updated');
      eventBus.emit('bookings.updated', payload);
    },
  });
}

module.exports = { createBookingsEvents };
