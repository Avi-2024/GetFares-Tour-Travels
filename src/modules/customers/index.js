const { CustomersController } = require('./customers.controller');
const { CustomersService } = require('./customers.service');
const { CustomersRepository } = require('./customers.repository');
const { createCustomersRoutes } = require('./customers.routes');
const { CustomersValidation } = require('./customers.validation');
const { CustomersSchema } = require('./customers.schema');
const { createCustomersEvents } = require('./customers.events');

function createCustomersModule({ dependencies }) {
  const repository = new CustomersRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: CustomersSchema,
  });

  const events = createCustomersEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new CustomersService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new CustomersController({ service });

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
