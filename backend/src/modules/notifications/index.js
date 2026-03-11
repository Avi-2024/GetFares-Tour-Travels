const { createNotificationsRepository } = require('./notifications.repository');
const { createNotificationsService } = require('./notifications.service');
const { createNotificationsController } = require('./notifications.controller');
const { createNotificationsRoutes } = require('./notifications.routes');
const { NotificationsValidation } = require('./notifications.validation');
const { NotificationsSchema } = require('./notifications.schema');
const { createNotificationsEvents } = require('./notifications.events');
const { registerNotificationsSubscribers } = require('./notifications.subscribers');

function createNotificationsModule({ dependencies }) {
  const repository = createNotificationsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: NotificationsSchema,
  });

  const events = createNotificationsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createNotificationsService({
    repository,
    logger: dependencies.logger,
    events,
    eventPublisher: dependencies.eventPublisher,
  });

  const controller = createNotificationsController({ service });

  const router = createNotificationsRoutes({
    controller,
    validation: NotificationsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  const subscribers = registerNotificationsSubscribers({
    eventBus: dependencies.eventBus,
    service,
    logger: dependencies.logger,
  });

  return Object.freeze({
    name: 'notifications',
    router,
    controller,
    service,
    repository,
    events,
    subscribers,
  });
}

module.exports = { createNotificationsModule };
