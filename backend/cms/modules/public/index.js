import { createPublicCmsController } from "./public.controller.js";
import { createPublicCmsRoutes } from "./public.routes.js";

function createPublicCmsModule({
  landingService,
  destinationsService,
  packagesService,
  visaService,
  experienceService,
}) {
  const controller = createPublicCmsController({
    landingService,
    destinationsService,
    packagesService,
    visaService,
    experienceService,
  });

  const routes = createPublicCmsRoutes({ controller });

  return Object.freeze({
    controller,
    routes,
  });
}

export { createPublicCmsModule };
