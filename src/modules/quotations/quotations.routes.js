const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createQuotationsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('quotations:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('quotations:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('quotations:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('quotations:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createQuotationsRoutes };
