import { ExperienceSchema } from "./experience.schema.js";
import { createExperienceRepository } from "./experience.repository.js";
import { createExperienceService } from "./experience.service.js";
import { createExperienceController } from "./experience.controller.js";
import { createExperienceRoutes } from "./experience.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createExperienceModule({ db, storage, upload, logger }) {
  const repository = createExperienceRepository({
    db,
    schema: ExperienceSchema,
  });
  const service = createExperienceService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createExperienceController({ service, uploadService });
  const routes = createExperienceRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createExperienceModule };
