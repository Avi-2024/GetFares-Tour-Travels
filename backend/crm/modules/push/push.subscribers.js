function registerPushSubscribers({ eventBus, service, logger }) {
  const listener = (payload) => {
    Promise.resolve(
      service.sendLeadAssignedPush({
        assigneeId: payload?.assigneeId,
        leadId: payload?.leadId,
        leadName: payload?.leadName || payload?.fullName || payload?.name,
        fullName: payload?.fullName,
        phone: payload?.phone,
        email: payload?.email,
        city: payload?.city,
        travelTo: payload?.travelTo,
        destinationName: payload?.destinationName,
        leadCode: payload?.leadCode,
      }),
    ).catch((error) => {
      logger.error(
        { err: error, module: "push", eventName: "leads.assigned" },
        "Lead assigned push failed",
      );
    });
  };

  eventBus.on("leads.assigned", listener);

  return Object.freeze({
    teardown() {
      eventBus.off("leads.assigned", listener);
    },
  });
}

export { registerPushSubscribers };

