import { createPackagesController } from "./packages.controller.js";
import { createPackagesService } from "./packages.service.js";
import { createPackagesRepository } from "./packages.repository.js";
import { createPackagesRoutes } from "./packages.routes.js";
import { PackagesValidation } from "./packages.validation.js";
import { PackagesSchema } from "./packages.schema.js";
import { createPackagesEvents } from "./packages.events.js";
import { createCmsPackagesRepository } from "../../../cms/modules/packages/packages.repository.js";
import { createCmsPackagesService } from "../../../cms/modules/packages/packages.service.js";
import { CmsPackagesSchema } from "../../../cms/modules/packages/packages.schema.js";
import { createCmsUploadService } from "../../../cms/core/uploads/cms-upload.service.js";
import { createMemoryUpload } from "../../core/uploads/index.js";

function createPackagesModule({ dependencies }) {
  const repository = createPackagesRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: PackagesSchema,
  });

  const cmsRepository = createCmsPackagesRepository({
    db: dependencies.db,
    schema: CmsPackagesSchema,
  });
  const cmsService = createCmsPackagesService({ repository: cmsRepository });
  const upload = createMemoryUpload({ maxFileSizeMb: 200 });
  const uploadService = createCmsUploadService({
    s3: dependencies.storage?.s3,
    logger: dependencies.logger,
  });

  const events = createPackagesEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createPackagesService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createPackagesController({ service, cmsService, uploadService });

  const router = createPackagesRoutes({
    controller,
    validation: PackagesValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
    upload,
  });

  return Object.freeze({
    name: "packages",
    router,
    controller,
    service,
    repository,
    events,
    cmsService,
    cmsRepository,
    uploadService,
  });
}

export { createPackagesModule };
