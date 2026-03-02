const { createApp } = require('./app');

const { app, container } = createApp();

app.listen(container.config.app.port, () => {
  container.logger.info(
    { port: container.config.app.port, env: container.config.env },
    `${container.config.app.name} is listening`,
  );
});
