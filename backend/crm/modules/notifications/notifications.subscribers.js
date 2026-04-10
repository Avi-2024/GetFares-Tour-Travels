const DOMAIN_EVENT_NAMES = Object.freeze([
    "auth.registered",
  "auth.logged_in",
  "leads.created",
  "leads.updated",
  "leads.assigned",
  "leads.reassigned",
  "leads.distribution_run",
  "leads.followup_created",
  "leads.followup_due_soon",
  "leads.followup_overdue",
  "leads.sla_breached",
  "leads.escalated",
]);

function registerNotificationsSubscribers({ eventBus, service, logger }) {
  const listeners = [];

  DOMAIN_EVENT_NAMES.forEach((eventName) => {
    const listener = (payload) => {
      Promise.resolve(
        service.captureDomainEvent({
          eventName,
          payload: payload || {},
        }),
      ).catch((error) => {
        logger.error(
          {
            err: error,
            module: "notifications",
            eventName,
          },
          "Domain event notification publish failed",
        );
      });
    };

    eventBus.on(eventName, listener);
    listeners.push({ eventName, listener });
  });

  logger.info(
    { module: "notifications", subscriptions: DOMAIN_EVENT_NAMES.length },
    "Notification subscribers registered",
  );

  function teardown() {
    listeners.forEach(({ eventName, listener }) => {
      eventBus.off(eventName, listener);
    });
  }

  return Object.freeze({
    domainEvents: DOMAIN_EVENT_NAMES,
    teardown,
  });
}

export { registerNotificationsSubscribers };
