const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createVisaRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get(
    '/reports/summary',
    requireAuth,
    authorize('visa:read'),
    validateRequest(validation.summaryReport),
    asyncHandler(controller.getSummaryReport),
  );

  router.get('/', requireAuth, authorize('visa:read'), validateRequest(validation.list), asyncHandler(controller.list));

  router.get(
    '/:id/documents',
    requireAuth,
    authorize('visa:read'),
    validateRequest(validation.listDocuments),
    asyncHandler(controller.listDocuments),
  );

  router.post(
    '/:id/documents',
    requireAuth,
    authorize('visa:update'),
    validateRequest(validation.createDocument),
    asyncHandler(controller.createDocument),
  );

  router.patch(
    '/documents/:documentId/verify',
    requireAuth,
    authorize('visa:update'),
    validateRequest(validation.verifyDocument),
    asyncHandler(controller.verifyDocument),
  );

  router.get(
    '/:id/checklist',
    requireAuth,
    authorize('visa:read'),
    validateRequest(validation.byVisaId),
    asyncHandler(controller.getChecklist),
  );

  router.patch(
    '/:id/checklist',
    requireAuth,
    authorize('visa:update'),
    validateRequest(validation.updateChecklist),
    asyncHandler(controller.updateChecklist),
  );

  router.post(
    '/:id/status',
    requireAuth,
    authorize('visa:update'),
    validateRequest(validation.transitionStatus),
    asyncHandler(controller.transitionStatus),
  );

  router.get('/:id', requireAuth, authorize('visa:read'), validateRequest(validation.byId), asyncHandler(controller.getById));
  router.post('/', requireAuth, authorize('visa:create'), validateRequest(validation.create), asyncHandler(controller.create));
  router.patch('/:id', requireAuth, authorize('visa:update'), validateRequest(validation.update), asyncHandler(controller.update));

  return router;
}

module.exports = { createVisaRoutes };
