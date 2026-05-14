import { createComplaintsController } from "./complaints.controller.js";
import { createComplaintsService } from "./complaints.service.js";
import { createComplaintsRepository } from "./complaints.repository.js";
import { createComplaintsRoutes } from "./complaints.routes.js";
import { ComplaintsValidation } from "./complaints.validation.js";
import { ComplaintsSchema } from "./complaints.schema.js";
import { createComplaintsEvents } from "./complaints.events.js";

function createComplaintsModule({ dependencies, repositories = {} }) {
  const repository = createComplaintsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: ComplaintsSchema,
  });

  const events = createComplaintsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createComplaintsService({
    repository,
    bookingsRepository: repositories.bookings,
    leadsRepository: repositories.leads,
    logger: dependencies.logger,
    events,
  });

  const controller = createComplaintsController({ service });

  const router = createComplaintsRoutes({
    controller,
    validation: ComplaintsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "complaints",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createComplaintsModule };
