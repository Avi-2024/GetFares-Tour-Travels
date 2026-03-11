const { createRbacController } = require('./rbac.controller');
const { createRbacService } = require('./rbac.service');
const { createRbacRepository } = require('./rbac.repository');
const { createRbacRoutes } = require('./rbac.routes');
const { RbacValidation } = require('./rbac.validation');
const { RbacSchema } = require('./rbac.schema');
const { createRbacEvents } = require('./rbac.events');
const { createRbacMiddleware } = require('./rbac.middleware');

function createRbacModule({ dependencies }) {
  const repository = createRbacRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: RbacSchema,
  });

  const events = createRbacEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createRbacService({
    repository,
    events,
  });

  const middleware = createRbacMiddleware({ rbacService: service });

  const controller = createRbacController({ service });

  const router = createRbacRoutes({
    controller,
    validation: RbacValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: middleware.authorize,
  });

  return Object.freeze({
    name: 'rbac',
    router,
    controller,
    service,
    repository,
    events,
    middleware,
  });
}

module.exports = { createRbacModule };
