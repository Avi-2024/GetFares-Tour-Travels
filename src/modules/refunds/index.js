const { RefundsController } = require('./refunds.controller');
const { RefundsService } = require('./refunds.service');
const { RefundsRepository } = require('./refunds.repository');
const { createRefundsRoutes } = require('./refunds.routes');
const { RefundsValidation } = require('./refunds.validation');
const { RefundsSchema } = require('./refunds.schema');
const { createRefundsEvents } = require('./refunds.events');

function createRefundsModule({ dependencies }) {
  const repository = new RefundsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: RefundsSchema,
  });

  const events = createRefundsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new RefundsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new RefundsController({ service });

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
