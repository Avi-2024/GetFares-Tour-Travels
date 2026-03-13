function createComplaintsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'complaints.created');
      eventBus.emit('complaints.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'complaints.updated');
      eventBus.emit('complaints.updated', payload);
    },
    emitActivityAdded(payload) {
      logger.info({ id: payload.id, complaintId: payload.complaint_id }, 'complaints.activity_added');
      eventBus.emit('complaints.activity_added', payload);
    },
  });
}

module.exports = { createComplaintsEvents };
