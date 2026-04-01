import { LandingPlacesSchema } from "./landing.schema.js";
import { createLandingRepository } from "./landing.repository.js";
import { createLandingService } from "./landing.service.js";
import { createLandingController } from "./landing.controller.js";
import { createLandingRoutes } from "./landing.routes.js";

function createLandingModule({ db }) {
  const repository = createLandingRepository({
    db,
    schema: LandingPlacesSchema,
  });
  const service = createLandingService({ repository });
  const controller = createLandingController({ service });
  const routes = createLandingRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createLandingModule };
