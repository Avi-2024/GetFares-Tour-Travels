import { createLeadsController } from "./leads.controller.js";
import { createLeadsService } from "./leads.service.js";
import { createLeadsRepository } from "./leads.repository.js";
import { createLeadsRoutes } from "./leads.routes.js";
import { createLeadActivitiesRoutes } from "./leadActivities.routes.js";
import { LeadsValidation } from "./leads.validation.js";
import { LeadsSchema } from "./leads.schema.js";
import { createLeadsEvents } from "./leads.events.js";

function createLeadsModule({ dependencies }) {
  const repository = createLeadsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: LeadsSchema,
  });

  const events = createLeadsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createLeadsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createLeadsController({ service });

  const router = createLeadsRoutes({
    controller,
    validation: LeadsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    optionalAuth: dependencies.middlewares.optionalAuth,
    authorize: dependencies.middlewares.authorize,
  });

  const leadActivitiesRouter = createLeadActivitiesRoutes({
    controller,
    validation: LeadsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: "leads",
    router,
    leadActivitiesRouter,
    controller,
    service,
    repository,
    events,
  });
}

export { createLeadsModule };
