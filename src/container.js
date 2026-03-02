const EventEmitter = require('node:events');
const { config } = require('./core/config');
const { logger } = require('./core/logger');
const { createDatabaseConnection } = require('./core/database');
const coreMiddlewares = require('./core/middlewares');

function createContainer(overrides = {}) {
  const eventBus = overrides.eventBus || new EventEmitter();
  const db = overrides.db || createDatabaseConnection({ config, logger });

  return {
    config,
    logger,
    db,
    eventBus,
    middlewares: {
      ...coreMiddlewares,
      requireAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
      authorize: () => (req, res, next) => next(),
    },
  };
}

module.exports = { createContainer };
