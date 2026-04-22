import { createReportsController } from "./reports.controller.js";
import { createReportsService } from "./reports.service.js";
import { createReportsRepository } from "./reports.repository.js";
import { createReportsRoutes } from "./reports.routes.js";
import { ReportsValidation } from "./reports.validation.js";
import { ReportsSchema } from "./reports.schema.js";
import { createReportsEvents } from "./reports.events.js";

function createReportsModule({ dependencies }) {
  const repository = createReportsRepository({
    db: dependencies.db,
    schema: ReportsSchema,
    logger: dependencies.logger,
  });

  const events = createReportsEvents();

  const service = createReportsService({
    repository,
    logger: dependencies.logger,
    events,
    currencyService: dependencies.services?.currency,
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
    name: "reports",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createReportsModule };
