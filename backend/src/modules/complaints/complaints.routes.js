const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createComplaintsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('complaints:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('complaints:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.get(
    '/:id/activities',
    requireAuth,
    authorize('complaints:read'),
    validateRequest(validation.listActivities),
    asyncHandler(controller.listActivities),
  );
  router.post('/', requireAuth, authorize('complaints:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.post(
    '/:id/activities',
    requireAuth,
    authorize('complaints:update'),
    validateRequest(validation.createActivity),
    asyncHandler(controller.createActivity),
  );
  router.patch('/:id', requireAuth, authorize('complaints:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createComplaintsRoutes };
