const { createUsersController } = require('./users.controller');
const { createUsersService } = require('./users.service');
const { createUsersRepository } = require('./users.repository');
const { createUsersRoutes } = require('./users.routes');
const { UsersValidation } = require('./users.validation');
const { UsersSchema } = require('./users.schema');
const { createUsersEvents } = require('./users.events');

function createUsersModule({ dependencies }) {
  const repository = createUsersRepository({
    db: dependencies.db,
    logger: dependencies.logger,
    schema: UsersSchema,
  });

  const events = createUsersEvents({
    eventBus: dependencies.eventBus,
    logger: dependencies.logger,
  });

  const service = createUsersService({
    repository,
    logger: dependencies.logger,
    events,
  });

  const controller = createUsersController({ service });

  const router = createUsersRoutes({
    controller,
    validation: UsersValidation,
    validateRequest: dependencies.middlewares.validateRequest,
    requireAuth: dependencies.middlewares.requireAuth,
    authorize: dependencies.middlewares.authorize,
  });

  return Object.freeze({
    name: 'users',
    router,
    controller,
    service,
    repository,
    events,
  });
}

module.exports = { createUsersModule };
