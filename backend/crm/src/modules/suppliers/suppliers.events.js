function createSuppliersEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, "suppliers.created");
      eventBus.emit("suppliers.created", payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, "suppliers.updated");
      eventBus.emit("suppliers.updated", payload);
    },
    emitPayableCreated(payload) {
      logger.info(
        { id: payload.id, supplierId: payload.supplierId },
        "suppliers.payable_created",
      );
      eventBus.emit("suppliers.payable_created", payload);
    },
    emitPayableUpdated(payload) {
      logger.info(
        { id: payload.id, supplierId: payload.supplierId },
        "suppliers.payable_updated",
      );
      eventBus.emit("suppliers.payable_updated", payload);
    },
    emitPayableDeadlineAlert(payload) {
      logger.warn(
        {
          payableId: payload.payableId,
          supplierId: payload.supplierId,
          alertType: payload.alertType,
          alertDate: payload.alertDate,
        },
        "suppliers.payable_deadline_alert",
      );
      eventBus.emit("suppliers.payable_deadline_alert", payload);
    },
  });
}

export { createSuppliersEvents };
