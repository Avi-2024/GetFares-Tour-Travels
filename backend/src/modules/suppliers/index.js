import { createSuppliersController } from "./suppliers.controller.js";
import { createSuppliersService } from "./suppliers.service.js";
import { createSuppliersRepository } from "./suppliers.repository.js";
import { createSuppliersRoutes } from "./suppliers.routes.js";
import { SuppliersValidation } from "./suppliers.validation.js";
import { SuppliersSchema } from "./suppliers.schema.js";
import { createSuppliersEvents } from "./suppliers.events.js";

function createSuppliersModule({ dependencies }) {
  const repository = createSuppliersRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: SuppliersSchema,
  });

  const events = createSuppliersEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createSuppliersService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createSuppliersController({ service });

  const router = createSuppliersRoutes({
    controller,
    validation: SuppliersValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "suppliers",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createSuppliersModule };
