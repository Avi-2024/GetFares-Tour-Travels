import { createAuthController } from "./auth.controller.js";
import { createAuthService } from "./auth.service.js";
import { createAuthRepository } from "./auth.repository.js";
import { createAuthRoutes } from "./auth.routes.js";
import { AuthValidation } from "./auth.validation.js";
import { AuthSchema } from "./auth.schema.js";
import { createAuthEvents } from "./auth.events.js";
import { createAuthMiddleware } from "./auth.middleware.js";

function createAuthModule({ dependencies }) {
  const repository = createAuthRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: AuthSchema,
    authConfig: dependencies.config?.auth,
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
    rolesService: dependencies.services?.roles,
    tokenBlacklistService: dependencies.services?.tokenBlacklist,
  });

  const middleware = createAuthMiddleware({
    authService: service,
    logger: dependencies.logger,
  });

  const controller = createAuthController({ service });

  const router = createAuthRoutes({
    controller,
    validation: AuthValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: middleware.requireAuth,
  });

  return Object.freeze({
    name: "auth",
    router,
    controller,
    service,
    repository,
    events,
    middleware,
  });
}

export { createAuthModule };
