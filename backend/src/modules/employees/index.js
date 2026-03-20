import { createEmployeesController } from "./employees.controller.js";
import { createEmployeesService } from "./employees.service.js";
import { createEmployeesRepository } from "./employees.repository.js";
import { createEmployeesRoutes } from "./employees.routes.js";
import { EmployeesValidation } from "./employees.validation.js";
import { EmployeesSchema } from "./employees.schema.js";
import { createEmployeesEvents } from "./employees.events.js";

function createEmployeesModule({ dependencies }) {
  const repository = createEmployeesRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: EmployeesSchema,
  });

  const events = createEmployeesEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createEmployeesService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createEmployeesController({ service });

  const router = createEmployeesRoutes({
    controller,
    validation: EmployeesValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "employees",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createEmployeesModule };
