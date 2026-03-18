import { createApp } from "../src/app.js";

let appInstance = null;
let containerInstance = null;

const getAppAndContainer = () => {
  if (!appInstance) {
    const { app, container } = createApp();
    appInstance = app;
    containerInstance = container;
  }
  return { app: appInstance, container: containerInstance };
};

const handler = (req, res) => {
  const { app } = getAppAndContainer();
  return app(req, res);
};

export default handler;
