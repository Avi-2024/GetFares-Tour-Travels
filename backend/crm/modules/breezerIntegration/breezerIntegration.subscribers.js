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
