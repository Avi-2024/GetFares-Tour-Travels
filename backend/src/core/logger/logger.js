const pino = require('pino');
const { config } = require('../config');

const logger = pino({
  level: config.logger.level,
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password'],
    censor: '[REDACTED]',
  },
});

module.exports = { logger };
