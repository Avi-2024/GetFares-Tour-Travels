const { VisaController } = require('./visa.controller');
const { VisaService } = require('./visa.service');
const { VisaRepository } = require('./visa.repository');
const { createVisaRoutes } = require('./visa.routes');
const { VisaValidation } = require('./visa.validation');
const { VisaSchema } = require('./visa.schema');
const { createVisaEvents } = require('./visa.events');

function createVisaModule({ dependencies }) {
  const repository = new VisaRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: VisaSchema,
  });

  const events = createVisaEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new VisaService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new VisaController({ service });

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
