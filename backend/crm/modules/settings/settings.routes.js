import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createSettingsRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.getAll),
    asyncHandler(controller.getAll),
  );
  router.get(
    "/system",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.getSystem),
    asyncHandler(controller.getSystem),
  );
  router.get(
    "/system/preferences",
    requireAuth,
    validateRequest(validation.getSystemPreferences),
    asyncHandler(controller.getSystemPreferences),
  );
  router.patch(
    "/system",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updateSystem),
    asyncHandler(controller.updateSystem),
  );
  router.get(
    "/integrations",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.getIntegrations),
    asyncHandler(controller.getIntegrations),
  );
  router.patch(
    "/integrations",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updateIntegrations),
    asyncHandler(controller.updateIntegrations),
  );
  router.get(
    "/lead-status-workflow",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.getLeadStatusWorkflow),
    asyncHandler(controller.getLeadStatusWorkflow),
  );
  router.post(
    "/lead-status-workflow/main",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.createLeadStatusMain),
    asyncHandler(controller.createLeadStatusMain),
  );
  router.patch(
    "/lead-status-workflow/main/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updateLeadStatusMain),
    asyncHandler(controller.updateLeadStatusMain),
  );
  router.post(
    "/lead-status-workflow/sub",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.createLeadStatusSub),
    asyncHandler(controller.createLeadStatusSub),
  );
  router.patch(
    "/lead-status-workflow/sub/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updateLeadStatusSub),
    asyncHandler(controller.updateLeadStatusSub),
  );
  router.patch(
    "/lead-status-workflow/reorder",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.reorderLeadStatusWorkflow),
    asyncHandler(controller.reorderLeadStatusWorkflow),
  );

  return router;
}

export { createSettingsRoutes };
