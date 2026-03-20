import express from 'express';

function createDashboardRoutes(dependencies, controller) {
  const router = express.Router();
  const { middlewares } = dependencies;

  // Test endpoint to verify module is loaded
  router.get('/test', (req, res) => {
    res.json({ message: 'Dashboard module is working!', timestamp: new Date().toISOString() });
  });

  // Apply authentication middleware to all dashboard routes except test
  if (middlewares?.requireAuth) {
    router.use('/stats', middlewares.requireAuth);
    router.use('/revenue', middlewares.requireAuth);
    router.use('/lead-sources', middlewares.requireAuth);
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