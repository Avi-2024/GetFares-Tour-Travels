const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createRefundsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('refunds:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('refunds:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('refunds:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('refunds:update'), validateRequest(validation.update), asyncHandler(controller.update));
  router.post('/:id/approve', requireAuth, authorize('refunds:update'), validateRequest(validation.approve), asyncHandler(controller.approve));
  router.post('/:id/reject', requireAuth, authorize('refunds:update'), validateRequest(validation.reject), asyncHandler(controller.reject));
  router.post('/:id/process', requireAuth, authorize('refunds:update'), validateRequest(validation.process), asyncHandler(controller.process));

  return router;
}

module.exports = { createRefundsRoutes };
