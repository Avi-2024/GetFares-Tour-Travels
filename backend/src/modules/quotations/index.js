import { createQuotationsController } from "./quotations.controller.js";
import { createQuotationsService } from "./quotations.service.js";
import { createQuotationsRepository } from "./quotations.repository.js";
import { createQuotationsRoutes } from "./quotations.routes.js";
import { QuotationsValidation } from "./quotations.validation.js";
import { QuotationsSchema } from "./quotations.schema.js";
import { createQuotationsEvents } from "./quotations.events.js";

function createQuotationsModule({ dependencies }) {
  const repository = createQuotationsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: QuotationsSchema,
  });

  const events = createQuotationsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createQuotationsService({
    repository,
    logger: dependencies.logger,
    events,
    s3: dependencies.storage?.s3,
  });

  const controller = createQuotationsController({ service });

  const router = createQuotationsRoutes({
    controller,
    validation: QuotationsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "quotations",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createQuotationsModule };
