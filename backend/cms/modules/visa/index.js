import { VisaSchema } from "./visa.schema.js";
import { createVisaRepository } from "./visa.repository.js";
import { createVisaService } from "./visa.service.js";
import { createVisaController } from "./visa.controller.js";
import { createVisaRoutes } from "./visa.routes.js";
import { createCmsUploadService } from "../../core/uploads/cms-upload.service.js";

function createVisaModule({ db, storage, upload, logger }) {
  const repository = createVisaRepository({ db, schema: VisaSchema });
  const service = createVisaService({ repository });
  const uploadService = createCmsUploadService({
    s3: storage?.s3,
    logger,
  });
  const controller = createVisaController({ service, uploadService });
  const routes = createVisaRoutes({ controller, upload });

  return {
    repository,
    service,
    uploadService,
    controller,
    routes,
  };
}

export { createVisaModule };
