import { createRefundsController } from "./refunds.controller.js";
import { createRefundsService } from "./refunds.service.js";
import { createRefundsRepository } from "./refunds.repository.js";
import { createRefundsRoutes } from "./refunds.routes.js";
import { RefundsValidation } from "./refunds.validation.js";
import { RefundsSchema } from "./refunds.schema.js";
import { createRefundsEvents } from "./refunds.events.js";

function createRefundsModule({ dependencies, repositories = {} }) {
  const repository = createRefundsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: RefundsSchema,
  });

  const events = createRefundsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createRefundsService({
    repository,
    bookingsRepository: repositories.bookings,
    leadsRepository: repositories.leads,
    logger: dependencies.logger,
    events,
  });

  const controller = createRefundsController({ service });

  const router = createRefundsRoutes({
    controller,
    validation: RefundsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "refunds",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createRefundsModule };
