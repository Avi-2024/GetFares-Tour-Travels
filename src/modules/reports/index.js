const { createReportsController } = require('./reports.controller');
const { createReportsService } = require('./reports.service');
const { createReportsRepository } = require('./reports.repository');
const { createReportsRoutes } = require('./reports.routes');
const { ReportsValidation } = require('./reports.validation');
const { ReportsSchema } = require('./reports.schema');
const { createReportsEvents } = require('./reports.events');

function createReportsModule({ dependencies }) {
  const repository = createReportsRepository({
    db: dependencies.db,
    schema: ReportsSchema,
  });

  const events = createReportsEvents();

  const service = createReportsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createReportsController({ service });

  const router = createReportsRoutes({
    controller,
    validation: ReportsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'reports',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createReportsModule };
