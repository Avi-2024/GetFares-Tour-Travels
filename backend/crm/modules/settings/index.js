import { createSettingsController } from "./settings.controller.js";
import { createSettingsService } from "./settings.service.js";
import { createSettingsRepository } from "./settings.repository.js";
import { createSettingsRoutes } from "./settings.routes.js";
import { SettingsValidation } from "./settings.validation.js";
import { SettingsSchema } from "./settings.schema.js";
import { createSettingsEvents } from "./settings.events.js";

function createSettingsModule({ dependencies }) {
  const repository = createSettingsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: SettingsSchema,
  });

  const events = createSettingsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createSettingsService({
    repository,
    logger: dependencies.logger,
    events,
    schema: SettingsSchema,
  });

  const controller = createSettingsController({ service });

  const router = createSettingsRoutes({
    controller,
    validation: SettingsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "settings",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createSettingsModule };
