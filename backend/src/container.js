import EventEmitter from "node:events";
import { config } from "./core/config/index.js";
import { logger } from "./core/logger/index.js";
import { createDatabaseConnection } from "./core/database/index.js";
import { createSocketEventPublisher } from "./core/realtime/index.js";
import { createMetricsStore } from "./core/observability/index.js";
import { createS3Service } from "./core/storage/index.js";
import { createRolesService } from "./core/roles/index.js";
import { createMailService } from "./core/mail/index.js";
import * as coreMiddlewares from "./core/middlewares/index.js";

function createContainer(overrides = {}) {
  const eventBus = overrides.eventBus || new EventEmitter();
  const db = overrides.db || createDatabaseConnection({ config, logger });
  const eventPublisher =
    overrides.eventPublisher || createSocketEventPublisher({ logger });
  const metricsStore =
    overrides.metricsStore ||
    createMetricsStore({
      serviceName: config.app.name,
      serviceVersion: config.app.version,
    });
  const s3 = overrides.s3 || createS3Service({ config, logger });
  const rolesService =
    overrides.rolesService || createRolesService({ db, logger });
  const mailService =
    overrides.mailService || createMailService({ logger });

  return {
    config,
    logger,
    db,
    eventBus,
    eventPublisher,
    metricsStore,
    storage: {
      s3,
    },
    services: {
      roles: rolesService,
      mail: mailService,
    },
    middlewares: {
      ...coreMiddlewares,
      requireAuth: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
      authorize: () => (req, res, next) => next(),
    },
  };
}

export { createContainer };
