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

  return router;
}

export { createSettingsRoutes };
