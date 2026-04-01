import { CmsPackagesSchema } from "./packages.schema.js";
import { createCmsPackagesRepository } from "./packages.repository.js";
import { createCmsPackagesService } from "./packages.service.js";
import { createCmsPackagesController } from "./packages.controller.js";
import { createCmsPackagesRoutes } from "./packages.routes.js";

function createCmsPackagesModule({ db }) {
  const repository = createCmsPackagesRepository({
    db,
    schema: CmsPackagesSchema,
  });
  const service = createCmsPackagesService({ repository });
  const controller = createCmsPackagesController({ service });
  const routes = createCmsPackagesRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createCmsPackagesModule };
