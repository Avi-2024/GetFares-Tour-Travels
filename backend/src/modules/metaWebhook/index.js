import { createMetaWebhookController } from "./metaWebhook.controller.js";
import { createMetaLeadService } from "./metaLead.service.js";
import { createMetaLeadRepository } from "./metaLead.repository.js";
import { createMetaWebhookRoutes } from "./metaWebhook.routes.js";
import { MetaWebhookValidation } from "./metaWebhook.validation.js";
import { createMetaApi } from "./metaApi.js";

function createMetaWebhookModule({ dependencies, leadsService }) {
  if (!leadsService) {
    throw new Error("Meta webhook module requires leadsService dependency");
  }

  const repository = createMetaLeadRepository({
    db: dependencies.db,
    logger: dependencies.logger,
  });

  const metaApi = createMetaApi({
    accessToken: dependencies.config?.meta?.accessToken,
    graphBaseUrl: dependencies.config?.meta?.graphBaseUrl,
    graphVersion: dependencies.config?.meta?.graphVersion,
    graphFields: dependencies.config?.meta?.graphFields,
    logger: dependencies.logger,
  });

  const service = createMetaLeadService({
    repository,
    leadsService,
    metaApi,
    logger: dependencies.logger,
    config: dependencies.config,
  });

  const controller = createMetaWebhookController({ service });

  const router = createMetaWebhookRoutes({
    controller,
    validation: MetaWebhookValidation,
    validateRequest: dependencies.middlewares.validateRequest,
  });

  return Object.freeze({
    name: "metaWebhook",
    router,
    controller,
    service,
    repository,
  });
}

export { createMetaWebhookModule };
