import { createRbacController } from "./rbac.controller.js";
import { createRbacService } from "./rbac.service.js";
import { createRbacRepository } from "./rbac.repository.js";
import { createRbacRoutes } from "./rbac.routes.js";
import { RbacValidation } from "./rbac.validation.js";
import { RbacSchema } from "./rbac.schema.js";
import { createRbacEvents } from "./rbac.events.js";
import { createRbacMiddleware } from "./rbac.middleware.js";

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
    logger: dependencies.logger,
    cacheTtlMs: dependencies.config?.rbac?.permissionCacheTtlMs || 60_000,
    rolesService: dependencies.services?.roles,
  });

  const middleware = createRbacMiddleware({ rbacService: service });

  const controller = createRbacController({ service });

  const routes = createRbacRoutes({
    controller,
    validation: RbacValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: middleware.authorize,
  });

  return Object.freeze({
    name: "rbac",
    router: routes.adminRouter,
    permissionsRouter: routes.permissionsRouter,
    rolesRouter: routes.rolesRouter,
    controller,
    service,
    repository,
    events,
    middleware,
  });
}

export { createRbacModule };
