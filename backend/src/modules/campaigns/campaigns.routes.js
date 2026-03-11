const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createCampaignsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/', requireAuth, authorize('campaigns:read'), validateRequest(validation.list), asyncHandler(controller.list));
  router.get('/:id', requireAuth, authorize('campaigns:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('campaigns:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('campaigns:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createCampaignsRoutes };
