const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createRbacRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.post('/assign', requireAuth, authorize('rbac:manage'), validateRequest(validation.assignRole), asyncHandler(controller.assignRole));
  router.get('/me/permissions', requireAuth, asyncHandler(controller.myPermissions));

  return router;
}

module.exports = { createRbacRoutes };
