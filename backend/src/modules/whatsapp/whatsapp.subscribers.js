function registerWhatsappSubscribers({ eventBus, service, logger }) {
  const subscriptions = [];

  function on(eventName, handler) {
    const wrapped = async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger?.warn({ err: error, eventName }, "WhatsApp handler failed");
      }
    };
    eventBus.on(eventName, wrapped);
    subscriptions.push([eventName, wrapped]);
  }

  on("leads.created", service.notifyLeadWelcome);
  on("quotations.sent", service.notifyQuotationSent);
  on("quotations.reminder_triggered", service.notifyQuotationReminder);
  on("bookings.pre_travel_reminder", service.notifyPreTravel);
  on("bookings.post_travel_feedback", service.notifyPostTravel);

  return Object.freeze({
    dispose() {
      subscriptions.forEach(([eventName, handler]) => {
        eventBus.off(eventName, handler);
      });
    },
  });
}

export { registerWhatsappSubscribers };
