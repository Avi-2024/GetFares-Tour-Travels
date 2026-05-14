import { CountriesSchema } from "./countries.schema.js";
import { createCountriesRepository } from "./countries.repository.js";
import { createCountriesService } from "./countries.service.js";
import { createCountriesController } from "./countries.controller.js";
import { createCountriesRoutes } from "./countries.routes.js";

function createCountriesModule({ db }) {
  const repository = createCountriesRepository({ db, schema: CountriesSchema });
  const service = createCountriesService({ repository });
  const controller = createCountriesController({ service });
  const routes = createCountriesRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createCountriesModule };
