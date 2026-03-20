import { createVisaController } from "./visa.controller.js";
import { createVisaService } from "./visa.service.js";
import { createVisaRepository } from "./visa.repository.js";
import { createVisaRoutes } from "./visa.routes.js";
import { VisaValidation } from "./visa.validation.js";
import { VisaSchema } from "./visa.schema.js";
import { createVisaEvents } from "./visa.events.js";

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

  const controller = createVisaController({
    service,
    s3: dependencies.storage?.s3,
  });

  const router = createVisaRoutes({
    controller,
    validation: VisaValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
    config: dependencies.config,
  });

  return Object.freeze({
    name: "visa",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createVisaModule };
