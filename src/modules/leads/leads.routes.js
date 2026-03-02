const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createLeadsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('leads:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.post('/', requireAuth, authorize('leads:create'), validateRequest(validation.create), asyncHandler(controller.create));

  router.post(
    '/distribute',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.distribute),
    asyncHandler(controller.distribute),
  );

  router.post(
    '/reassign-inactive',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.reassignInactive),
    asyncHandler(controller.reassignInactive),
  );

  router.get(
    '/followups/overdue',
    requireAuth,
    authorize('leads:read'),
    validateRequest(validation.listOverdueFollowups),
    asyncHandler(controller.listOverdueFollowups),
  );

  router.post(
    '/followups/process-overdue',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.processOverdueFollowups),
    asyncHandler(controller.processOverdueFollowups),
  );

  router.post(
    '/sla/process-breaches',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.processSlaBreaches),
    asyncHandler(controller.processSlaBreaches),
  );

  router.get('/:id', requireAuth, authorize('leads:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.patch('/:id', requireAuth, authorize('leads:update'), validateRequest(validation.update), asyncHandler(controller.update));

  router.post(
    '/:id/assign',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.assign),
    asyncHandler(controller.assign),
  );

  router.post(
    '/:id/followups',
    requireAuth,
    authorize('leads:update'),
    validateRequest(validation.createFollowup),
    asyncHandler(controller.createFollowup),
  );

  return router;
}

module.exports = { createLeadsRoutes };
