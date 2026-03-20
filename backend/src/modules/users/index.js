import { createUsersController } from "./users.controller.js";
import { createUsersService } from "./users.service.js";
import { createUsersRepository } from "./users.repository.js";
import { createUsersRoutes } from "./users.routes.js";
import { UsersValidation } from "./users.validation.js";
import { UsersSchema } from "./users.schema.js";
import { createUsersEvents } from "./users.events.js";

function createUsersModule({ dependencies }) {
  const repository = createUsersRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: UsersSchema,
  });

  const events = createUsersEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createUsersService({
    repository,
    logger: dependencies.logger,
    events,
    rbacService: dependencies.services?.rbac,
    rolesService: dependencies.services?.roles,
  });

  const controller = createUsersController({ service });

  const router = createUsersRoutes({
    controller,
    validation: UsersValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "users",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createUsersModule };
