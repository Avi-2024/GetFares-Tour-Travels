const { BookingsController } = require('./bookings.controller');
const { BookingsService } = require('./bookings.service');
const { BookingsRepository } = require('./bookings.repository');
const { createBookingsRoutes } = require('./bookings.routes');
const { BookingsValidation } = require('./bookings.validation');
const { BookingsSchema } = require('./bookings.schema');
const { createBookingsEvents } = require('./bookings.events');

function createBookingsModule({ dependencies }) {
  const repository = new BookingsRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: BookingsSchema,
  });

  const events = createBookingsEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = new BookingsService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = new BookingsController({ service });

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
