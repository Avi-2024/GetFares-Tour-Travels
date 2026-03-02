const { QuotationsController } = require('./quotations.controller');
const { QuotationsService } = require('./quotations.service');
const { QuotationsRepository } = require('./quotations.repository');
const { createQuotationsRoutes } = require('./quotations.routes');
const { QuotationsValidation } = require('./quotations.validation');
const { QuotationsSchema } = require('./quotations.schema');
const { createQuotationsEvents } = require('./quotations.events');

function createQuotationsModule({ dependencies }) {
  const repository = new QuotationsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: QuotationsSchema,
  });

  const events = createQuotationsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new QuotationsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new QuotationsController({ service });

  const router = createQuotationsRoutes({
    controller,
    validation: QuotationsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'quotations',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createQuotationsModule };
