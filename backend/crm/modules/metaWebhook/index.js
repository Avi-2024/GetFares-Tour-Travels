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
import { createMetaPageConfigRepository } from "./metaPageConfig.repository.js";
import { createMetaPageConfigService } from "./metaPageConfig.service.js";
import { createMetaPageConfigController } from "./metaPageConfig.controller.js";
import { createMetaPageConfigRoutes } from "./metaPageConfig.routes.js";
import { MetaPageConfigValidation } from "./metaPageConfig.validation.js";

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

  const pageConfigRepository = createMetaPageConfigRepository({
    db: dependencies.db,
    logger: dependencies.logger,
  });

  const pageConfigService = createMetaPageConfigService({
    repository: pageConfigRepository,
    config: dependencies.config,
    logger: dependencies.logger,
  });

  const pageConfigController = createMetaPageConfigController({
    service: pageConfigService,
  });

  const pageConfigRouter = createMetaPageConfigRoutes({
    controller: pageConfigController,
    validation: MetaPageConfigValidation,
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
    pageConfigProvider: pageConfigService,
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
    pageConfigRouter,
    controller,
    service,
    repository,
    mappingService,
    mappingResolver,
    pageConfigService,
  });
}

export { createMetaWebhookModule };
