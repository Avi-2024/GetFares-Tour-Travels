const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const { createContainer } = require('./container');
const { registerModules } = require('./modules');
const { requestContext, notFound, errorHandler } = require('./core/middlewares');

function createApp(overrides = {}) {
  const app = express();
  const container = createContainer(overrides);

  app.use(helmet());
  app.use(cors({ origin: container.config.app.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger: container.logger }));
  app.use(requestContext);

  const modules = registerModules(app, container);

  app.get('/health', (req, res) => {
    res.status(200).json({
      service: container.config.app.name,
      env: container.config.env,
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return { app, container, modules };
}

module.exports = { createApp };
