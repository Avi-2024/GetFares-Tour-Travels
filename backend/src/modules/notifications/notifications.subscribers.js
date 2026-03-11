const DOMAIN_EVENT_NAMES = Object.freeze([
  'auth.registered',
  'auth.logged_in',
  'leads.created',
  'leads.updated',
  'leads.assigned',
  'leads.reassigned',
  'leads.distribution_run',
  'leads.followup_created',
  'leads.followup_overdue',
  'leads.sla_breached',
  'leads.escalated',
  'quotations.created',
  'quotations.updated',
  'quotations.sent',
  'quotations.viewed',
  'quotations.status_changed',
  'quotations.pdf_generated',
  'quotations.margin_approved',
  'quotations.reminder_triggered',
  'bookings.created',
  'bookings.updated',
  'payments.created',
  'payments.updated',
  'refunds.created',
  'refunds.updated',
  'visa.created',
  'visa.updated',
  'campaigns.created',
  'campaigns.updated',
  'customers.created',
  'customers.updated',
  'complaints.created',
  'complaints.updated',
  'webhooks.lead_captured',
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
            module: 'notifications',
            eventName,
          },
          'Domain event notification publish failed',
        );
      });
    };

    eventBus.on(eventName, listener);
    listeners.push({ eventName, listener });
  });

  logger.info(
    { module: 'notifications', subscriptions: DOMAIN_EVENT_NAMES.length },
    'Notification subscribers registered',
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

module.exports = { registerNotificationsSubscribers };
