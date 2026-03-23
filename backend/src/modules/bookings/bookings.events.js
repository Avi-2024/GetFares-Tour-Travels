function createBookingsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, "bookings.created");
      eventBus.emit("bookings.created", payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, "bookings.updated");
      eventBus.emit("bookings.updated", payload);
    },
    emitStatusChanged(payload) {
      logger.info(
        {
          id: payload.id,
          oldStatus: payload.oldStatus,
          newStatus: payload.newStatus,
        },
        "bookings.status_changed",
      );
      eventBus.emit("bookings.status_changed", payload);
    },
    emitInvoiceGenerated(payload) {
      logger.info(
        { bookingId: payload.bookingId, invoiceId: payload.invoiceId },
        "bookings.invoice_generated",
      );
      eventBus.emit("bookings.invoice_generated", payload);
    },
    emitPreTravelReminder(payload) {
      logger.info(
        { bookingId: payload.bookingId, scheduledFor: payload.scheduledFor },
        "bookings.pre_travel_reminder",
      );
      eventBus.emit("bookings.pre_travel_reminder", payload);
    },
    emitPostTravelFeedback(payload) {
      logger.info(
        { bookingId: payload.bookingId, scheduledFor: payload.scheduledFor },
        "bookings.post_travel_feedback",
      );
      eventBus.emit("bookings.post_travel_feedback", payload);
    },
    emitDeadlineAlert(payload) {
      logger.warn(
        {
          bookingId: payload.bookingId,
          alertType: payload.alertType,
          alertDate: payload.alertDate,
        },
        "bookings.deadline_alert",
      );
      eventBus.emit("bookings.deadline_alert", payload);
    },
  });
}

export { createBookingsEvents };
