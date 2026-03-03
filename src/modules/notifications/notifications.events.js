function createNotificationsEvents({ eventBus, logger }) {
  return Object.freeze({
    emitCreated(payload) {
      logger.info({ id: payload.id, eventName: payload.eventName }, 'notifications.created');
      eventBus.emit('notifications.created', payload);
    },

    emitDeliveryUpdated(payload) {
      logger.info(
        {
          id: payload.id,
          status: payload.status,
          deliveryAttempts: payload.deliveryAttempts,
        },
        'notifications.delivery_updated',
      );
      eventBus.emit('notifications.delivery_updated', payload);
    },

    emitRead(payload) {
      logger.info({ id: payload.id, userId: payload.recipientUserId }, 'notifications.read');
      eventBus.emit('notifications.read', payload);
    },

    emitReadAll(payload) {
      logger.info({ userId: payload.userId, count: payload.count }, 'notifications.read_all');
      eventBus.emit('notifications.read_all', payload);
    },
  });
}

module.exports = { createNotificationsEvents };
