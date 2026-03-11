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

    emitSent(payload) {
      logger.info({ id: payload.id, sentBy: payload.sentBy }, 'quotations.sent');
      eventBus.emit('quotations.sent', payload);
    },

    emitViewed(payload) {
      logger.info({ id: payload.id, viewCount: payload.viewCount }, 'quotations.viewed');
      eventBus.emit('quotations.viewed', payload);
    },

    emitStatusChanged(payload) {
      logger.info({ id: payload.id, status: payload.status }, 'quotations.status_changed');
      eventBus.emit('quotations.status_changed', payload);
    },

    emitPdfGenerated(payload) {
      logger.info({ id: payload.id, pdfUrl: payload.pdfUrl }, 'quotations.pdf_generated');
      eventBus.emit('quotations.pdf_generated', payload);
    },

    emitMarginApproved(payload) {
      logger.info({ id: payload.id, approvedBy: payload.approvedBy }, 'quotations.margin_approved');
      eventBus.emit('quotations.margin_approved', payload);
    },

    emitReminderTriggered(payload) {
      logger.info(
        { quotationId: payload.quotationId, reminderType: payload.reminderType },
        'quotations.reminder_triggered',
      );
      eventBus.emit('quotations.reminder_triggered', payload);
    },
  });
}

module.exports = { createQuotationsEvents };
