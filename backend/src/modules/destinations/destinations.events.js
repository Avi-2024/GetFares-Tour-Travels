function createDestinationsEvents({ eventBus, logger }) {
  function emit(eventName, payload) {
    if (!eventBus || typeof eventBus.emit !== "function") {
      return;
    }

    try {
      eventBus.emit(eventName, payload);
    } catch (error) {
      logger?.warn?.(
        { err: error, module: "destinations", eventName },
        "Failed to emit destination event",
      );
    }
  }

  return Object.freeze({
    emitCreated(payload) {
      emit("destinations.created", payload);
    },
    emitUpdated(payload) {
      emit("destinations.updated", payload);
    },
    emitPricingCreated(payload) {
      emit("destinations.pricing.created", payload);
    },
    emitPricingUpdated(payload) {
      emit("destinations.pricing.updated", payload);
    },
  });
}

export { createDestinationsEvents };
