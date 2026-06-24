import { createBreezerIntegrationController } from "./breezerIntegration.controller.js";
import { createBreezerIntegrationRoutes } from "./breezerIntegration.routes.js";
import { createBreezerIntegrationService } from "./breezerIntegration.service.js";
import { registerBreezerIntegrationSubscribers } from "./breezerIntegration.subscribers.js";
import { BreezerIntegrationValidation } from "./breezerIntegration.validation.js";

// Creates the Breezer integration module.
function createBreezerIntegrationModule({ dependencies, bookingsService }) {
  const service = createBreezerIntegrationService({
    bookingsService,
    logger: dependencies.logger,
  });
  const controller = createBreezerIntegrationController({ service });
  const router = createBreezerIntegrationRoutes({
    controller,
    validation: BreezerIntegrationValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });
  const subscribers = registerBreezerIntegrationSubscribers({
    eventBus: dependencies.eventBus,
    service,
    logger: dependencies.logger,
  });

  return Object.freeze({
    name: "breezerIntegration",
    router,
    service,
    controller,
    subscribers,
    stop: subscribers.teardown,
  });
}

export { createBreezerIntegrationModule };
