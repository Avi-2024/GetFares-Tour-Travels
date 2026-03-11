function createWebhooksEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCaptured(payload) {
      logger.info(
        {
          leadId: payload.lead?.id,
          duplicate: payload.duplicate,
          provider: payload.provider,
        },
        'webhooks.lead_captured',
      );
      eventBus.emit('webhooks.lead_captured', payload);
    },
  });
}

module.exports = { createWebhooksEvents };
