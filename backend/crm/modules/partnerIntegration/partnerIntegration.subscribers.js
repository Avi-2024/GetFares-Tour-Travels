import crypto from "node:crypto";

const EVENT_MAP = Object.freeze({
  "leads.created": { eventType: "lead.created", entityType: "lead" },
  "leads.updated": { eventType: "lead.updated", entityType: "lead" },
  "bookings.created": { eventType: "booking.created", entityType: "booking" },
  "bookings.updated": { eventType: "booking.updated", entityType: "booking" },
  "bookings.status_changed": {
    eventType: "booking.updated",
    entityType: "booking",
  },
  "payments.created": { eventType: "payment.created", entityType: "payment" },
  "payments.updated": { eventType: "payment.updated", entityType: "payment" },
  "payments.verified": { eventType: "payment.updated", entityType: "payment" },
  "refunds.created": { eventType: "refund.created", entityType: "refund" },
  "refunds.updated": { eventType: "refund.updated", entityType: "refund" },
  "refunds.approved": { eventType: "refund.updated", entityType: "refund" },
  "refunds.rejected": { eventType: "refund.updated", entityType: "refund" },
  "refunds.processed": { eventType: "refund.updated", entityType: "refund" },
});

function registerPartnerIntegrationSubscribers({
  eventBus,
  service,
  logger,
}) {
  const listeners = [];

  Object.entries(EVENT_MAP).forEach(([domainEvent, definition]) => {
    const listener = (payload = {}) => {
      const entityId = String(payload.id || "").trim();
      if (!entityId) return;

      const rootBookingId =
        definition.entityType === "booking"
          ? entityId
          : String(payload.bookingId || payload.booking_id || "").trim() || null;

      void service
        .captureWebhookEvent({
          eventId: crypto.randomUUID(),
          ...definition,
          entityId,
          rootBookingId,
        })
        .catch((error) => {
          logger.error(
            { err: error, module: "partnerIntegration", domainEvent, entityId },
            "Webhook outbox capture failed",
          );
        });
    };

    eventBus.on(domainEvent, listener);
    listeners.push({ domainEvent, listener });
  });

  return Object.freeze({
    teardown() {
      listeners.forEach(({ domainEvent, listener }) => {
        eventBus.off(domainEvent, listener);
      });
    },
  });
}

export { registerPartnerIntegrationSubscribers };
