const { createBookingsController } = require('./bookings.controller');
const { createBookingsService } = require('./bookings.service');
const { createBookingsRepository } = require('./bookings.repository');
const { createBookingsRoutes } = require('./bookings.routes');
const { BookingsValidation } = require('./bookings.validation');
const { BookingsSchema } = require('./bookings.schema');
const { createBookingsEvents } = require('./bookings.events');

function createBookingsModule({ dependencies }) {
  const repository = createBookingsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: BookingsSchema,
  });

  const events = createBookingsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createBookingsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createBookingsController({ service });

  const router = createBookingsRoutes({
    controller,
    validation: BookingsValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'bookings',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createBookingsModule };
