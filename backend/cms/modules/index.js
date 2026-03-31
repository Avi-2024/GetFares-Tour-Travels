import express from "express";

function registerModules(app, dependencies, options = {}) {
  const basePath = options.basePath || "/cms/api";
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({
      service: dependencies.config?.app?.name || "cms-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(basePath, router);

  return {
    router,
    basePath,
  };
}

export { registerModules };
