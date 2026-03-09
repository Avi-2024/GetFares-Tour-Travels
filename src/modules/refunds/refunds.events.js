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
    emitApproved(payload) {
      logger.info({ id: payload.id, approvedBy: payload.approvedBy }, 'refunds.approved');
      eventBus.emit('refunds.approved', payload);
    },
    emitRejected(payload) {
      logger.info({ id: payload.id, rejectedBy: payload.rejectedBy }, 'refunds.rejected');
      eventBus.emit('refunds.rejected', payload);
    },
    emitProcessed(payload) {
      logger.info({ id: payload.id, bookingId: payload.bookingId }, 'refunds.processed');
      eventBus.emit('refunds.processed', payload);
    },
  });
}

module.exports = { createRefundsEvents };
