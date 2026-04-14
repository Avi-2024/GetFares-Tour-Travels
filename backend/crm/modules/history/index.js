import { createHistoryController } from "./history.controller.js";
import { createHistoryService } from "./history.service.js";
import { createHistoryRepository } from "./history.repository.js";
import { createHistoryRoutes } from "./history.routes.js";
import { HistoryValidation } from "./history.validation.js";
import { HistorySchema } from "./history.schema.js";

function createHistoryModule({ dependencies }) {
  const repository = createHistoryRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: HistorySchema,
  });

  const service = createHistoryService({ repository });
  const controller = createHistoryController({ service });

  const router = createHistoryRoutes({
    controller,
    validation: HistoryValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "history",
    router,
    controller,
    service,
    repository,
  });
}

export { createHistoryModule };
