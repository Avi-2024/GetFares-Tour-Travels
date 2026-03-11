const { createRefundsController } = require('./refunds.controller');
const { createRefundsService } = require('./refunds.service');
const { createRefundsRepository } = require('./refunds.repository');
const { createRefundsRoutes } = require('./refunds.routes');
const { RefundsValidation } = require('./refunds.validation');
const { RefundsSchema } = require('./refunds.schema');
const { createRefundsEvents } = require('./refunds.events');

function createRefundsModule({ dependencies }) {
  const repository = createRefundsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: RefundsSchema,
  });

  const events = createRefundsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createRefundsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createRefundsController({ service });

  const router = createRefundsRoutes({
    controller,
    validation: RefundsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'refunds',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createRefundsModule };
