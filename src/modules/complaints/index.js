const { ComplaintsController } = require('./complaints.controller');
const { createComplaintsService } = require('./complaints.service');
const { ComplaintsRepository } = require('./complaints.repository');
const { createComplaintsRoutes } = require('./complaints.routes');
const { ComplaintsValidation } = require('./complaints.validation');
const { ComplaintsSchema } = require('./complaints.schema');
const { createComplaintsEvents } = require('./complaints.events');

function createComplaintsModule({ dependencies }) {
  const repository = new ComplaintsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: ComplaintsSchema,
  });

  const events = createComplaintsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createComplaintsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new ComplaintsController({ service });

  const router = createComplaintsRoutes({
    controller,
    validation: ComplaintsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'complaints',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createComplaintsModule };
