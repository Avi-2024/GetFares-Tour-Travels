import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createLeadActivitiesRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.post(
    "/",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.createLeadActivity),
    asyncHandler(controller.createLeadActivity),
  );

  router.get(
    "/",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listLeadActivities),
    asyncHandler(controller.listLeadActivities),
  );

  return router;
}

export { createLeadActivitiesRoutes };
