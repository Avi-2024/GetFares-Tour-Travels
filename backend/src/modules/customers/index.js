import { createCustomersController } from "./customers.controller.js";
import { createCustomersService } from "./customers.service.js";
import { createCustomersRepository } from "./customers.repository.js";
import { createCustomersRoutes } from "./customers.routes.js";
import { CustomersValidation } from "./customers.validation.js";
import { CustomersSchema } from "./customers.schema.js";
import { createCustomersEvents } from "./customers.events.js";

function createCustomersModule({ dependencies }) {
  const repository = createCustomersRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: CustomersSchema,
  });

  const events = createCustomersEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createCustomersService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createCustomersController({ service });

  const router = createCustomersRoutes({
    controller,
    validation: CustomersValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "customers",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createCustomersModule };
