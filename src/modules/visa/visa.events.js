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
    emitStatusChanged(payload) {
      logger.info({ id: payload.id, status: payload.status }, 'visa.status_changed');
      eventBus.emit('visa.status_changed', payload);
    },
    emitDocumentAdded(payload) {
      logger.info({ visaCaseId: payload.visaCaseId, documentId: payload.id }, 'visa.document_added');
      eventBus.emit('visa.document_added', payload);
    },
    emitDocumentVerified(payload) {
      logger.info({ visaCaseId: payload.visaCaseId, documentId: payload.id, isVerified: payload.isVerified }, 'visa.document_verified');
      eventBus.emit('visa.document_verified', payload);
    },
    emitChecklistUpdated(payload) {
      logger.info({ bookingId: payload.bookingId, travelReady: payload.travelReady }, 'visa.checklist_updated');
      eventBus.emit('visa.checklist_updated', payload);
    },
  });
}

module.exports = { createVisaEvents };
