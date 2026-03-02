const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createCustomersRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('customers:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('customers:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('customers:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('customers:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createCustomersRoutes };
