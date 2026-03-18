import express from 'express';

function createDashboardRoutes(dependencies, controller) {
  const router = express.Router();
  const { middlewares } = dependencies;

  // Apply authentication middleware to all dashboard routes
  if (middlewares?.requireAuth) {
    router.use(middlewares.requireAuth);
  }

  // Dashboard stats endpoint
  router.get('/stats', (req, res) => controller.getStats(req, res));

  // Revenue data endpoint
  router.get('/revenue', (req, res) => controller.getRevenue(req, res));

  // Lead sources endpoint
  router.get('/lead-sources', (req, res) => controller.getLeadSources(req, res));

  return router;
}

export { createDashboardRoutes };