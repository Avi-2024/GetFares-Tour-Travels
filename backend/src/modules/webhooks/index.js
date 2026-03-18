import { createWebhooksController } from "./webhooks.controller.js";
import { createWebhooksService } from "./webhooks.service.js";
import { createWebhooksRoutes } from "./webhooks.routes.js";
import { WebhooksValidation } from "./webhooks.validation.js";
import { WebhooksSchema } from "./webhooks.schema.js";
import { createWebhooksEvents } from "./webhooks.events.js";

function createWebhooksModule({ dependencies, leadsService }) {
  if (!leadsService) {
    throw new Error("Webhooks module requires leadsService dependency");
  }

  const events = createWebhooksEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createWebhooksService({
    leadsService,
    events,
    schema: WebhooksSchema,
  });

  const controller = createWebhooksController({ service });

  const router = createWebhooksRoutes({
    controller,
    validation: WebhooksValidation,
    validateRequest: dependencies.middlewares.validateRequest,
  });

  return Object.freeze({
    name: "webhooks",
    router,
    controller,
    service,
    events,
  });
}

export { createWebhooksModule };
