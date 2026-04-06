import { ExperienceSchema } from "./experience.schema.js";
import { createExperienceRepository } from "./experience.repository.js";
import { createExperienceService } from "./experience.service.js";
import { createExperienceController } from "./experience.controller.js";
import { createExperienceRoutes } from "./experience.routes.js";

function createExperienceModule({ db }) {
  const repository = createExperienceRepository({
    db,
    schema: ExperienceSchema,
  });
  const service = createExperienceService({ repository });
  const controller = createExperienceController({ service });
  const routes = createExperienceRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createExperienceModule };
