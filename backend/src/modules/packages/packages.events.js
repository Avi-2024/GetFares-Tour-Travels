function createPackagesEvents({ eventBus, logger }) {
  function emit(eventName, payload) {
    if (!eventBus || typeof eventBus.emit !== "function") {
      return;
    }
    try {
      eventBus.emit(eventName, payload);
    } catch (error) {
      logger?.warn?.(
        { err: error, module: "packages", eventName },
        "Failed to emit packages event",
      );
    }
  }

  return Object.freeze({
    emitCreated(payload) {
      emit("packages.created", payload);
    },
    emitUpdated(payload) {
      emit("packages.updated", payload);
    },
    emitPublished(payload) {
      emit("packages.published", payload);
    },
    emitEnquiryCreated(payload) {
      emit("packages.enquiry.created", payload);
    },
  });
}

export { createPackagesEvents };
