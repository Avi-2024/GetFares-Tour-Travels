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
    emitStatusChanged(payload) {
      logger.info({ id: payload.id, oldStatus: payload.oldStatus, newStatus: payload.newStatus }, 'bookings.status_changed');
      eventBus.emit('bookings.status_changed', payload);
    },
    emitInvoiceGenerated(payload) {
      logger.info({ bookingId: payload.bookingId, invoiceId: payload.invoiceId }, 'bookings.invoice_generated');
      eventBus.emit('bookings.invoice_generated', payload);
    },
  });
}

module.exports = { createBookingsEvents };
