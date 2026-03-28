function createCountriesEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id, code: payload.code }, "countries.created");
      eventBus.emit("countries.created", payload);
    },

    emitUpdated(payload) {
      logger.info({ id: payload.id, code: payload.code }, "countries.updated");
      eventBus.emit("countries.updated", payload);
    },
  });
}

export { createCountriesEvents };
