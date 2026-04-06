import { DestinationsSchema } from "./destinations.schema.js";
import { createDestinationsRepository } from "./destinations.repository.js";
import { createDestinationsService } from "./destinations.service.js";
import { createDestinationsController } from "./destinations.controller.js";
import { createDestinationsRoutes } from "./destinations.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createDestinationsModule({ db, storage, upload, logger }) {
  const repository = createDestinationsRepository({
    db,
    schema: DestinationsSchema,
  });
  const service = createDestinationsService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createDestinationsController({ service, uploadService });
  const routes = createDestinationsRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createDestinationsModule };
