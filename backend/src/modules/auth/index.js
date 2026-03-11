const { createAuthController } = require('./auth.controller');
const { createAuthService } = require('./auth.service');
const { createAuthRepository } = require('./auth.repository');
const { createAuthRoutes } = require('./auth.routes');
const { AuthValidation } = require('./auth.validation');
const { AuthSchema } = require('./auth.schema');
const { createAuthEvents } = require('./auth.events');
const { createAuthMiddleware } = require('./auth.middleware');

function createAuthModule({ dependencies }) {
  const repository = createAuthRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: AuthSchema,
  });

  const events = createAuthEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createAuthService({
    repository,
    logger: dependencies.logger,
    events,
    authConfig: dependencies.config.auth,
  });

  const middleware = createAuthMiddleware({ authService: service });

  const controller = createAuthController({ service });

  const router = createAuthRoutes({
    controller,
    validation: AuthValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: middleware.requireAuth,
  });

  return Object.freeze({
    name: 'auth',
    router,
    controller,
    service,
    repository,
    events,
    middleware,
  });
}

module.exports = { createAuthModule };
