import { VisaSchema } from "./visa.schema.js";
import { createVisaRepository } from "./visa.repository.js";
import { createVisaService } from "./visa.service.js";
import { createVisaController } from "./visa.controller.js";
import { createVisaRoutes } from "./visa.routes.js";

function createVisaModule({ db }) {
  const repository = createVisaRepository({ db, schema: VisaSchema });
  const service = createVisaService({ repository });
  const controller = createVisaController({ service });
  const routes = createVisaRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createVisaModule };
