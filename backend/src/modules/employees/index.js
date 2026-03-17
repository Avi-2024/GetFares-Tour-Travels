const { createEmployeesController } = require("./employees.controller");
const { createEmployeesService } = require("./employees.service");
const { createEmployeesRepository } = require("./employees.repository");
const { createEmployeesRoutes } = require("./employees.routes");
const { EmployeesValidation } = require("./employees.validation");
const { EmployeesSchema } = require("./employees.schema");
const { createEmployeesEvents } = require("./employees.events");

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

module.exports = { createEmployeesModule };
