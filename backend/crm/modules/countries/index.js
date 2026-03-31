import { createCountriesController } from "./countries.controller.js";
import { createCountriesService } from "./countries.service.js";
import { createCountriesRepository } from "./countries.repository.js";
import { createCountriesRoutes } from "./countries.routes.js";
import { CountriesValidation } from "./countries.validation.js";
import { CountriesSchema } from "./countries.schema.js";
import { createCountriesEvents } from "./countries.events.js";

function createCountriesModule({ dependencies }) {
  const repository = createCountriesRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: CountriesSchema,
  });

  const events = createCountriesEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createCountriesService({
    repository,
    events,
  });

  const controller = createCountriesController({ service });

  const router = createCountriesRoutes({
    controller,
    validation: CountriesValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "countries",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createCountriesModule };
