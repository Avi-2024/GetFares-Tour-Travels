import { createBookingsController } from "./bookings.controller.js";
import { createBookingsService } from "./bookings.service.js";
import { createBookingsRepository } from "./bookings.repository.js";
import { createBookingsRoutes } from "./bookings.routes.js";
import { BookingsValidation } from "./bookings.validation.js";
import { BookingsSchema } from "./bookings.schema.js";
import { createBookingsEvents } from "./bookings.events.js";

function createBookingsModule({ dependencies, leadsRepository }) {
  const repository = createBookingsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: BookingsSchema,
  });

  const events = createBookingsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createBookingsService({
    repository,
    logger: dependencies.logger,
    events,
    config: dependencies.config,
    leadsRepository,
    currencyService: dependencies.services?.currency,
  });

  const controller = createBookingsController({ service });

  const router = createBookingsRoutes({
    controller,
    validation: BookingsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "bookings",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createBookingsModule };
