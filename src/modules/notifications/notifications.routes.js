const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createNotificationsRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    authorize('notifications:read'),
    validateRequest(validation.list),
    asyncHandler(controller.listMine),
  );

  router.get(
    '/unread-count',
    requireAuth,
    authorize('notifications:read'),
    validateRequest(validation.unreadCount),
    asyncHandler(controller.unreadCount),
  );

  router.patch(
    '/:id/read',
    requireAuth,
    authorize('notifications:update'),
    validateRequest(validation.markRead),
    asyncHandler(controller.markRead),
  );

  router.patch(
    '/read-all',
    requireAuth,
    authorize('notifications:update'),
    validateRequest(validation.markAllRead),
    asyncHandler(controller.markAllRead),
  );

  return router;
}

module.exports = { createNotificationsRoutes };
