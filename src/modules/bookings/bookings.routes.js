const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createBookingsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('bookings:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('bookings:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('bookings:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('bookings:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createBookingsRoutes };
