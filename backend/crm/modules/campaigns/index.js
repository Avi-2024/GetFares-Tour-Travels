import { createCampaignsController } from "./campaigns.controller.js";
import { createCampaignsService } from "./campaigns.service.js";
import { createCampaignsRepository } from "./campaigns.repository.js";
import { createCampaignsRoutes } from "./campaigns.routes.js";
import { CampaignsValidation } from "./campaigns.validation.js";
import { CampaignsSchema } from "./campaigns.schema.js";
import { createCampaignsEvents } from "./campaigns.events.js";

function createCampaignsModule({ dependencies, repositories = {} }) {
  const repository = createCampaignsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: CampaignsSchema,
  });

  const events = createCampaignsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createCampaignsService({
    repository,
    leadsRepository: repositories.leads,
    logger: dependencies.logger,
    events,
    currencyService: dependencies.services?.currency,
  });

  const controller = createCampaignsController({ service });

  const router = createCampaignsRoutes({
    controller,
    validation: CampaignsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "campaigns",
    router,
    controller,
    service,
    repository,
    events,
  });
}

export { createCampaignsModule };
