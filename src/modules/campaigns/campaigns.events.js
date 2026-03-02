function createCampaignsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id }, 'campaigns.created');
      eventBus.emit('campaigns.created', payload);
    },
    emitUpdated(payload) {
      logger.info({ id: payload.id }, 'campaigns.updated');
      eventBus.emit('campaigns.updated', payload);
    },
  });
}

module.exports = { createCampaignsEvents };
