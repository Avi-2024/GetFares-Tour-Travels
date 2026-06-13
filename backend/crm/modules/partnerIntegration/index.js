import { createPartnerIntegrationController } from "./partnerIntegration.controller.js";
import { createPartnerIntegrationMiddleware } from "./partnerIntegration.middleware.js";
import { createPartnerIntegrationRepository } from "./partnerIntegration.repository.js";
import { createPartnerIntegrationRoutes } from "./partnerIntegration.routes.js";
import { createPartnerIntegrationService } from "./partnerIntegration.service.js";
import { PartnerIntegrationValidation } from "./partnerIntegration.validation.js";
import {
  registerPartnerIntegrationSubscribers,
} from "./partnerIntegration.subscribers.js";

function createPartnerIntegrationModule({ dependencies }) {
  const repository = createPartnerIntegrationRepository({ db: dependencies.db });
  const service = createPartnerIntegrationService({
    repository,
    logger: dependencies.logger,
    encryptionKey: dependencies.config.auth.jwtAccessSecret,
  });
  const controller = createPartnerIntegrationController({ service });
  const middleware = createPartnerIntegrationMiddleware({
    db: dependencies.db,
    logger: dependencies.logger,
  });
  const router = createPartnerIntegrationRoutes({
    controller,
    requirePartnerApiKey: middleware.requirePartnerApiKey,
    requireScope: middleware.requireScope,
    validateRequest: dependencies.middlewares.validateRequest,
    validation: PartnerIntegrationValidation,
  });
  const subscribers = registerPartnerIntegrationSubscribers({
    eventBus: dependencies.eventBus,
    service,
    logger: dependencies.logger,
  });
  const workerTimer = setInterval(() => {
    void service.processWebhookDeliveries().catch((error) => {
      dependencies.logger.error(
        { err: error, module: "partnerIntegration" },
        "Webhook delivery worker failed",
      );
    });
  }, 5000);
  workerTimer.unref?.();

  return Object.freeze({
    name: "partnerIntegration",
    router,
    controller,
    service,
    repository,
    subscribers,
    stop() {
      clearInterval(workerTimer);
      subscribers.teardown();
    },
  });
}

export { createPartnerIntegrationModule };
