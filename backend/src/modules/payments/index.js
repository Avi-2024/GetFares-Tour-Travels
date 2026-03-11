const { createPaymentsController } = require('./payments.controller');
const { createPaymentsService } = require('./payments.service');
const { createPaymentsRepository } = require('./payments.repository');
const { createPaymentsRoutes } = require('./payments.routes');
const { PaymentsValidation } = require('./payments.validation');
const { PaymentsSchema } = require('./payments.schema');
const { createPaymentsEvents } = require('./payments.events');

function createPaymentsModule({ dependencies }) {
  const repository = createPaymentsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PaymentsSchema,
  });

  const events = createPaymentsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createPaymentsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createPaymentsController({ service });

  const router = createPaymentsRoutes({
    controller,
    validation: PaymentsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'payments',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createPaymentsModule };
