import { CmsMediaSchema } from "./media.schema.js";
import { createCmsMediaRepository } from "./media.repository.js";
import { createCmsMediaService } from "./media.service.js";
import { createCmsMediaController } from "./media.controller.js";
import { createCmsMediaRoutes } from "./media.routes.js";

function createCmsMediaModule({ db }) {
  const repository = createCmsMediaRepository({ db, schema: CmsMediaSchema });
  const service = createCmsMediaService({ repository });
  const controller = createCmsMediaController({ service });
  const routes = createCmsMediaRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createCmsMediaModule };
