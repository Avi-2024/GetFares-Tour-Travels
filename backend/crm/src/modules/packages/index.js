import { createPackagesController } from "./packages.controller.js";
import { createPackagesService } from "./packages.service.js";
import { createPackagesRepository } from "./packages.repository.js";
import { createPackagesRoutes } from "./packages.routes.js";
import { PackagesValidation } from "./packages.validation.js";
import { PackagesSchema } from "./packages.schema.js";
import { createPackagesEvents } from "./packages.events.js";

function createPackagesModule({ dependencies }) {
  const repository = createPackagesRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PackagesSchema,
  });

  const events = createPackagesEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createPackagesService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createPackagesController({ service });

  const router = createPackagesRoutes({
    controller,
    validation: PackagesValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "packages",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createPackagesModule };
