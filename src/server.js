const http = require('node:http');
const { createApp } = require('./app');
const { createSocketServer } = require('./core/realtime');

const { app, container, runtime } = createApp();
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
    { port: container.config.app.port, env: container.config.env, version: container.config.app.version },
    `${container.config.app.name} is listening`,
  );
});

let shuttingDown = false;

async function closeDependencies() {
  if (typeof socketServer?.close === 'function') {
    socketServer.close();
  }

  if (typeof container.db?.close === 'function') {
    await container.db.close();
  }
}

function initiateShutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  runtime.isShuttingDown = true;

  container.logger.warn(
    { signal, shutdownTimeoutMs: container.config.app.shutdownTimeoutMs },
    'Graceful shutdown started',
  );

  const forceShutdownTimer = setTimeout(() => {
    container.logger.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, container.config.app.shutdownTimeoutMs);

  forceShutdownTimer.unref?.();

  httpServer.close(async (serverCloseError) => {
    if (serverCloseError) {
      container.logger.error({ err: serverCloseError }, 'HTTP server close failed');
    }

    try {
      await closeDependencies();
      container.logger.info('Graceful shutdown completed');
    } catch (dependencyError) {
      container.logger.error({ err: dependencyError }, 'Error while closing dependencies');
    } finally {
      clearTimeout(forceShutdownTimer);
      process.exit(serverCloseError ? 1 : 0);
    }
  });
}

process.on('SIGTERM', () => initiateShutdown('SIGTERM'));
process.on('SIGINT', () => initiateShutdown('SIGINT'));
