const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createQuotationsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get(
    '/templates',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.listTemplates),
    asyncHandler(controller.listTemplates),
  );

  router.post(
    '/templates',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.createTemplate),
    asyncHandler(controller.createTemplate),
  );

  router.patch(
    '/templates/:id',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.updateTemplate),
    asyncHandler(controller.updateTemplate),
  );

  router.get(
    '/reports/lead-to-quote',
    requireAuth,
    authorize('reports:read'),
    validateRequest(validation.leadToQuoteReport),
    asyncHandler(controller.leadToQuoteReport),
  );

  router.post(
    '/reminders/run',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.runReminders),
    asyncHandler(controller.runReminders),
  );

  router.get(
    '/',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );

  router.post(
    '/',
    requireAuth,
    authorize('quotations:create'),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.post(
    '/:id/viewed',
    validateRequest(validation.trackView),
    asyncHandler(controller.trackView),
  );

  router.get(
    '/:id/views',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.views),
    asyncHandler(controller.listViews),
  );

  router.get(
    '/:id/versions',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.byId),
    asyncHandler(controller.listVersions),
  );

  router.get(
    '/:id/send-logs',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.byId),
    asyncHandler(controller.listSendLogs),
  );

  router.post(
    '/:id/generate-pdf',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.generatePdf),
    asyncHandler(controller.generatePdf),
  );

  router.post(
    '/:id/send',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.send),
    asyncHandler(controller.send),
  );

  router.post(
    '/:id/approve-margin',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.approveMargin),
    asyncHandler(controller.approveMargin),
  );

  router.post(
    '/:id/status',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.statusTransition),
    asyncHandler(controller.transitionStatus),
  );

  router.get(
    '/:id',
    requireAuth,
    authorize('quotations:read'),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );

  router.patch(
    '/:id',
    requireAuth,
    authorize('quotations:update'),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

module.exports = { createQuotationsRoutes };
