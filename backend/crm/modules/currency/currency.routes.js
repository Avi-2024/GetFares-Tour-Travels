import { Router } from 'express';

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function requireSuperAdmin(req, res, next) {
  const role = normalizeRole(req.context?.user?.role);
  if (role === "super_admin" || role === "superadmin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: "Only super admin can manage currency rates",
  });
}

function createCurrencyRoutes({ controller, requireAuth }) {
  const router = Router();

  router.get('/rates', controller.getRates);
  router.patch('/rates', requireAuth, requireSuperAdmin, controller.updateRates);
  router.get('/convert', controller.convert);

  return router;
}

export { createCurrencyRoutes };
