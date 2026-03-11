const { createWebhooksController } = require('./webhooks.controller');
const { createWebhooksService } = require('./webhooks.service');
const { createWebhooksRoutes } = require('./webhooks.routes');
const { WebhooksValidation } = require('./webhooks.validation');
const { WebhooksSchema } = require('./webhooks.schema');
const { createWebhooksEvents } = require('./webhooks.events');

function createWebhooksModule({ dependencies, leadsService }) {
  if (!leadsService) {
    throw new Error('Webhooks module requires leadsService dependency');
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
    name: 'webhooks',
    router,
    controller,
    service,
    events,
  });
}

module.exports = { createWebhooksModule };
