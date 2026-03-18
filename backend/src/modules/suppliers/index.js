const { createSuppliersController } = require("./suppliers.controller");
const { createSuppliersService } = require("./suppliers.service");
const { createSuppliersRepository } = require("./suppliers.repository");
const { createSuppliersRoutes } = require("./suppliers.routes");
const { SuppliersValidation } = require("./suppliers.validation");
const { SuppliersSchema } = require("./suppliers.schema");
const { createSuppliersEvents } = require("./suppliers.events");

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

module.exports = { createSuppliersModule };
