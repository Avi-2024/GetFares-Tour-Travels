// Registers Breezer event listeners for booking-created webhook delivery.
function registerBreezerIntegrationSubscribers({ eventBus, service, logger }) {
  const listeners = [];

  const onBookingCreated = (payload) => {
    Promise.resolve(
      service.sendBookingCreated(payload, { trigger: "bookings.created" }),
    ).catch((error) => {
      logger?.error(
        {
          err: error,
          module: "breezerIntegration",
          bookingId: payload?.id || null,
        },
        "Breezer booking.created webhook failed",
      );
    });

  };

  eventBus.on("bookings.created", onBookingCreated);
  listeners.push(["bookings.created", onBookingCreated]);

  const handleAsync = (eventName, payload, callback) => {
    Promise.resolve(callback(payload)).catch((error) => {
      logger?.error(
        {
          err: error,
          module: "breezerIntegration",
          eventName,
          entityId: payload?.id || null,
        },
        `Breezer ${eventName} webhook failed`,
      );
    });
  };

  const onPaymentCreated = (payload) => {
    handleAsync("payment.created", payload, (item) =>
      service.sendPaymentCreated(item, { trigger: "payments.created" }),
    );
  };

  const onPaymentUpdated = (payload) => {
    handleAsync("payment.updated", payload, (item) =>
      service.sendPaymentUpdated(item, { trigger: "payments.updated" }),
    );
  };

  const onRefundCreated = (payload) => {
    handleAsync("refund.created", payload, (item) =>
      service.sendRefundCreated(item, { trigger: "refunds.created" }),
    );
  };

  const onRefundUpdated = (payload) => {
    handleAsync("refund.updated", payload, (item) =>
      service.sendRefundUpdated(item, { trigger: "refunds.updated" }),
    );
  };

  eventBus.on("payments.created", onPaymentCreated);
  eventBus.on("payments.updated", onPaymentUpdated);
  eventBus.on("refunds.created", onRefundCreated);
  eventBus.on("refunds.updated", onRefundUpdated);
  listeners.push(["payments.created", onPaymentCreated]);
  listeners.push(["payments.updated", onPaymentUpdated]);
  listeners.push(["refunds.created", onRefundCreated]);
  listeners.push(["refunds.updated", onRefundUpdated]);

  logger?.info(
    { module: "breezerIntegration", subscriptions: listeners.length },
    "Breezer integration subscribers registered",
  );

  // Unsubscribes all Breezer event listeners during shutdown.
  function teardown() {
    listeners.forEach(([eventName, listener]) => {
      eventBus.off(eventName, listener);
    });
  }

  return Object.freeze({ teardown });
}

export { registerBreezerIntegrationSubscribers };
