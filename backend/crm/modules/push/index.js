import { createPushRepository } from "./push.repository.js";
import { createPushService } from "./push.service.js";
import { createPushController } from "./push.controller.js";
import { createPushRoutes } from "./push.routes.js";
import { PushValidation } from "./push.validation.js";
import { PushSchema } from "./push.schema.js";
import { registerPushSubscribers } from "./push.subscribers.js";

function createPushModule({ dependencies }) {
  const repository = createPushRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PushSchema,
  });

  const service = createPushService({
    repository,
    logger: dependencies.logger,
    config: dependencies.config,
  });

  const controller = createPushController({ service });

  const router = createPushRoutes({
    controller,
    validation: PushValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  const subscribers = registerPushSubscribers({
    eventBus: dependencies.eventBus,
    service,
    logger: dependencies.logger,
  });

  return Object.freeze({
    name: "push",
    router,
    controller,
    service,
    repository,
    subscribers,
  });
}

export { createPushModule };

