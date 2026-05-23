import { createMetaWebhookController } from "./metaWebhook.controller.js";
import { createMetaLeadService } from "./metaLead.service.js";
import { createMetaLeadRepository } from "./metaLead.repository.js";
import { createMetaWebhookRoutes } from "./metaWebhook.routes.js";
import { MetaWebhookValidation } from "./metaWebhook.validation.js";
import { createMetaApi } from "./metaApi.js";
import { createMetaLeadMappingRepository } from "./metaLeadMapping.repository.js";
import { createMetaLeadMappingResolver } from "./metaLeadMapping.resolver.js";
import { createMetaLeadMappingService } from "./metaLeadMapping.service.js";
import { createMetaLeadMappingController } from "./metaLeadMapping.controller.js";
import { createMetaLeadMappingRoutes } from "./metaLeadMapping.routes.js";
import { MetaLeadMappingValidation } from "./metaLeadMapping.validation.js";

function createMetaWebhookModule({ dependencies, leadsService }) {
  if (!leadsService) {
    throw new Error("Meta webhook module requires leadsService dependency");
  }

  const repository = createMetaLeadRepository({
    db: dependencies.db,
    logger: dependencies.logger,
  });

  const mappingRepository = createMetaLeadMappingRepository({
    db: dependencies.db,
    logger: dependencies.logger,
  });

  const mappingResolver = createMetaLeadMappingResolver({
    repository: mappingRepository,
    logger: dependencies.logger,
  });

  const mappingService = createMetaLeadMappingService({
    repository: mappingRepository,
    resolver: mappingResolver,
    logger: dependencies.logger,
  });

  const mappingController = createMetaLeadMappingController({
    service: mappingService,
  });

  const mappingRouter = createMetaLeadMappingRoutes({
    controller: mappingController,
    validation: MetaLeadMappingValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
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
    mappingResolver,
  });

  const controller = createMetaWebhookController({
    service,
    logger: dependencies.logger,
  });

  const router = createMetaWebhookRoutes({
    controller,
    validation: MetaWebhookValidation,
    validateRequest: dependencies.middlewares.validateRequest,
  });

  return Object.freeze({
    name: "metaWebhook",
    router,
    mappingRouter,
    controller,
    service,
    repository,
    mappingService,
    mappingResolver,
  });
}

export { createMetaWebhookModule };
