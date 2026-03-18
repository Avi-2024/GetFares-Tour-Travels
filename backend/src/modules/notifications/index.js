import { createNotificationsRepository } from "./notifications.repository.js";
import { createNotificationsService } from "./notifications.service.js";
import { createNotificationsController } from "./notifications.controller.js";
import { createNotificationsRoutes } from "./notifications.routes.js";
import { NotificationsValidation } from "./notifications.validation.js";
import { NotificationsSchema } from "./notifications.schema.js";
import { createNotificationsEvents } from "./notifications.events.js";
import {
  registerNotificationsSubscribers,
} from "./notifications.subscribers.js";

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
    name: "notifications",
    router,
    controller,
    service,
    repository,
    events,
    subscribers,
  });
}

export { createNotificationsModule };
