const { createApp } = require('../src/app');

let appInstance = null;
let containerInstance = null;

function getAppAndContainer() {
  if (!appInstance) {
    const { app, container } = createApp();
    appInstance = app;
    containerInstance = container;
  }
  return { app: appInstance, container: containerInstance };
}

// Export handler for Vercel
module.exports = (req, res) => {
  const { app } = getAppAndContainer();
  return app(req, res);
};
