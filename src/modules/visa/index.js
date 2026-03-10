const { createVisaController } = require('./visa.controller');
const { createVisaService } = require('./visa.service');
const { createVisaRepository } = require('./visa.repository');
const { createVisaRoutes } = require('./visa.routes');
const { VisaValidation } = require('./visa.validation');
const { VisaSchema } = require('./visa.schema');
const { createVisaEvents } = require('./visa.events');

function createVisaModule({ dependencies }) {
  const repository = createVisaRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: VisaSchema,
  });

  const events = createVisaEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createVisaService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createVisaController({ service });

  const router = createVisaRoutes({
    controller,
    validation: VisaValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'visa',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createVisaModule };
