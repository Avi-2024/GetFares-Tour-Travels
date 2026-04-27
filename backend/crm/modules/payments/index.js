import { createPaymentsController } from "./payments.controller.js";
import { createPaymentsService } from "./payments.service.js";
import { createPaymentsRepository } from "./payments.repository.js";
import { createPaymentsRoutes } from "./payments.routes.js";
import { PaymentsValidation } from "./payments.validation.js";
import { PaymentsSchema } from "./payments.schema.js";
import { createPaymentsEvents } from "./payments.events.js";

function createPaymentsModule({ dependencies, repositories = {} }) {
  const repository = createPaymentsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PaymentsSchema,
  });

  const events = createPaymentsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createPaymentsService({
    repository,
    bookingsRepository: repositories.bookings,
    leadsRepository: repositories.leads,
    logger: dependencies.logger,
    events,
    currencyService: dependencies.services?.currency,
  });

  const controller = createPaymentsController({
    service,
    s3: dependencies.storage?.s3,
  });

  const router = createPaymentsRoutes({
    controller,
    validation: PaymentsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
    config: dependencies.config,
  });

  return Object.freeze({
    name: "payments",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createPaymentsModule };
