import { CmsMediaSchema } from "./media.schema.js";
import { createCmsMediaRepository } from "./media.repository.js";
import { createCmsMediaService } from "./media.service.js";
import { createCmsMediaController } from "./media.controller.js";
import { createCmsMediaRoutes } from "./media.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createCmsMediaModule({ db, storage, upload, logger }) {
  const repository = createCmsMediaRepository({ db, schema: CmsMediaSchema });
  const service = createCmsMediaService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createCmsMediaController({ service, uploadService });
  const routes = createCmsMediaRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createCmsMediaModule };
