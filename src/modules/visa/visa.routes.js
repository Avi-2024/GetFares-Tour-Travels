const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createVisaRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('visa:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('visa:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('visa:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('visa:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createVisaRoutes };
