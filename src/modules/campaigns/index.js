const { CampaignsController } = require('./campaigns.controller');
const { createCampaignsService } = require('./campaigns.service');
const { CampaignsRepository } = require('./campaigns.repository');
const { createCampaignsRoutes } = require('./campaigns.routes');
const { CampaignsValidation } = require('./campaigns.validation');
const { CampaignsSchema } = require('./campaigns.schema');
const { createCampaignsEvents } = require('./campaigns.events');

function createCampaignsModule({ dependencies }) {
  const repository = new CampaignsRepository({
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
    logger: dependencies.logger,
    events,
  });

  const controller = new CampaignsController({ service });

  const router = createCampaignsRoutes({
    controller,
    validation: CampaignsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'campaigns',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createCampaignsModule };
