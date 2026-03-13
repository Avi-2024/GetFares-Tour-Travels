const { env } = require('./env');

const config = Object.freeze({
  env: env.NODE_ENV,
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  },
  auth: {
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  },
  database: {
    url: env.DATABASE_URL,
  },
  logger: {
    level: env.LOG_LEVEL,
  },
  health: {
    dbTimeoutMs: env.HEALTH_DB_TIMEOUT_MS,
  },
  metrics: {
    enabled: env.METRICS_ENABLED,
    token: env.METRICS_TOKEN,
  },
});

module.exports = { config };
