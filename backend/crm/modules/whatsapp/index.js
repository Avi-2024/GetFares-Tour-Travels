import { createWhatsAppApi } from "./whatsapp.api.js";
import { createWhatsAppService } from "./whatsapp.service.js";
import { createWhatsappController } from "./whatsapp.controller.js";
import { createWhatsappRepository } from "./whatsapp.repository.js";
import {
  createWhatsappRoutes,
  createWhatsappWebhookRoutes,
} from "./whatsapp.routes.js";
import { WhatsAppValidation } from "./whatsapp.validation.js";
import { registerWhatsappSubscribers } from "./whatsapp.subscribers.js";

function createWhatsappModule({
  dependencies,
  leadsService,
  quotationsService,
  bookingsService,
  paymentsService,
  refundsService,
  visaService,
}) {
  const repository = createWhatsappRepository({
    db: dependencies.db,
    logger: dependencies.logger,
  });

  const api = createWhatsAppApi({
    accessToken: dependencies.config.whatsapp.accessToken,
    baseUrl: dependencies.config.whatsapp.apiBaseUrl,
    version: dependencies.config.whatsapp.apiVersion,
    phoneNumberId: dependencies.config.whatsapp.phoneNumberId,
    logger: dependencies.logger,
  });

  const service = createWhatsAppService({
    api,
    repository,
    config: dependencies.config.whatsapp,
    logger: dependencies.logger,
    leadsService,
    quotationsService,
    bookingsService,
    paymentsService,
    refundsService,
    visaService,
  });

  const controller = createWhatsappController({ service });

  const router = createWhatsappRoutes({
    controller,
    validation: WhatsAppValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  const webhookRouter = createWhatsappWebhookRoutes({
    controller,
    validation: WhatsAppValidation,
    validateRequest: dependencies.middlewares.validateRequest,
  });

  const subscribers = registerWhatsappSubscribers({
    eventBus: dependencies.eventBus,
    service,
    logger: dependencies.logger,
  });

  return Object.freeze({
    name: "whatsapp",
    router,
    webhookRouter,
    controller,
    service,
    repository,
    subscribers,
  });
}

export { createWhatsappModule };
