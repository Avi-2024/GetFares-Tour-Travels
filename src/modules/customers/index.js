const { createCustomersController } = require('./customers.controller');
const { createCustomersService } = require('./customers.service');
const { createCustomersRepository } = require('./customers.repository');
const { createCustomersRoutes } = require('./customers.routes');
const { CustomersValidation } = require('./customers.validation');
const { CustomersSchema } = require('./customers.schema');
const { createCustomersEvents } = require('./customers.events');

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
    name: 'customers',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createCustomersModule };
