import { CmsPackagesSchema } from "./packages.schema.js";
import { createCmsPackagesRepository } from "./packages.repository.js";
import { createCmsPackagesService } from "./packages.service.js";
import { createCmsPackagesController } from "./packages.controller.js";
import { createCmsPackagesRoutes } from "./packages.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createCmsPackagesModule({ db, storage, upload, logger }) {
  const repository = createCmsPackagesRepository({
    db,
    schema: CmsPackagesSchema,
  });
  const service = createCmsPackagesService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createCmsPackagesController({ service, uploadService });
  const routes = createCmsPackagesRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createCmsPackagesModule };
