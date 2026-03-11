const http = require('node:http');
const { createApp } = require('./app');
const { createSocketServer } = require('./core/realtime');

const { app, container } = createApp();
const httpServer = http.createServer(app);

const socketServer = createSocketServer({
  httpServer,
  logger: container.logger,
  authConfig: container.config.auth,
  corsOrigin: container.config.app.corsOrigin,
});

container.eventPublisher.attachSocketServer(socketServer);

httpServer.listen(container.config.app.port, () => {
  container.logger.info(
    { port: container.config.app.port, env: container.config.env },
    `${container.config.app.name} is listening`,
  );
});
