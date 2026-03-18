import { env } from "./env.js";

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
  meta: {
    verifyToken: env.META_VERIFY_TOKEN,
    accessToken: env.META_ACCESS_TOKEN,
    graphBaseUrl: env.META_GRAPH_BASE_URL,
    graphVersion: env.META_GRAPH_VERSION,
    graphFields: env.META_GRAPH_FIELDS.split(",")
      .map((field) => field.trim())
      .filter(Boolean),
  },
});

export { config };
