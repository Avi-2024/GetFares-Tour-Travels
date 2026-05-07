import { LandingPlacesSchema } from "./landing.schema.js";
import { createLandingRepository } from "./landing.repository.js";
import { createLandingService } from "./landing.service.js";
import { createLandingController } from "./landing.controller.js";
import { createLandingRoutes } from "./landing.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createLandingModule({ db, storage, upload, logger }) {
  const repository = createLandingRepository({
    db,
    schema: LandingPlacesSchema,
  });
  const service = createLandingService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createLandingController({ service, uploadService });
  const routes = createLandingRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createLandingModule };
