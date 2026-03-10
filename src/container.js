const EventEmitter = require('node:events');
const { config } = require('./core/config');
const { logger } = require('./core/logger');
const { createDatabaseConnection } = require('./core/database');
const { createSocketEventPublisher } = require('./core/realtime');
const { createMetricsStore } = require('./core/observability');
const coreMiddlewares = require('./core/middlewares');

function createContainer(overrides = {}) {
  const eventBus = overrides.eventBus || new EventEmitter();
  const db = overrides.db || createDatabaseConnection({ config, logger });
  const eventPublisher = overrides.eventPublisher || createSocketEventPublisher({ logger });
  const metricsStore =
    overrides.metricsStore ||
    createMetricsStore({
      serviceName: config.app.name,
      serviceVersion: config.app.version,
    });

  return {
    config,
    logger,
    db,
    eventBus,
    eventPublisher,
    metricsStore,
    middlewares: {
      ...coreMiddlewares,
      requireAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
      authorize: () => (req, res, next) => next(),
    },
  };
}

module.exports = { createContainer };
