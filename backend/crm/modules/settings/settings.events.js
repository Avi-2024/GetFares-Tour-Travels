function createSettingsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitUpdated(section, payload) {
      logger.info({ section }, "settings.updated");
      eventBus.emit("settings.updated", { section, payload });
    },
  });
}

export { createSettingsEvents };
