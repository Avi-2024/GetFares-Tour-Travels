import { createDestinationsController } from "./destinations.controller.js";
import { createDestinationsService } from "./destinations.service.js";
import { createDestinationsRepository } from "./destinations.repository.js";
import { createDestinationsRoutes } from "./destinations.routes.js";
import { DestinationsValidation } from "./destinations.validation.js";
import { DestinationsSchema } from "./destinations.schema.js";
import { createDestinationsEvents } from "./destinations.events.js";

function createDestinationsModule({ dependencies }) {
  const repository = createDestinationsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: DestinationsSchema,
  });

  const events = createDestinationsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createDestinationsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createDestinationsController({ service });

  const router = createDestinationsRoutes({
    controller,
    validation: DestinationsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "destinations",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createDestinationsModule };
