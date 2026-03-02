const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createRefundsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('refunds:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('refunds:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('refunds:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('refunds:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createRefundsRoutes };
