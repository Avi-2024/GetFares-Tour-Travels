const { PaymentsController } = require('./payments.controller');
const { PaymentsService } = require('./payments.service');
const { PaymentsRepository } = require('./payments.repository');
const { createPaymentsRoutes } = require('./payments.routes');
const { PaymentsValidation } = require('./payments.validation');
const { PaymentsSchema } = require('./payments.schema');
const { createPaymentsEvents } = require('./payments.events');

function createPaymentsModule({ dependencies }) {
  const repository = new PaymentsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PaymentsSchema,
  });

  const events = createPaymentsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new PaymentsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new PaymentsController({ service });

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
