const { createLeadsController } = require('./leads.controller');
const { createLeadsService } = require('./leads.service');
const { createLeadsRepository } = require('./leads.repository');
const { createLeadsRoutes } = require('./leads.routes');
const { LeadsValidation } = require('./leads.validation');
const { LeadsSchema } = require('./leads.schema');
const { createLeadsEvents } = require('./leads.events');

function createLeadsModule({ dependencies }) {
  const repository = createLeadsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: LeadsSchema,
  });

  const events = createLeadsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createLeadsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createLeadsController({ service });

  const router = createLeadsRoutes({
    controller,
    validation: LeadsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'leads',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createLeadsModule };
