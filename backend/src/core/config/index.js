const { env } = require('./env');

const config = Object.freeze({
  env: env.NODE_ENV,
  app: {
    name: env.APP_NAME,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
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
});

module.exports = { config };
