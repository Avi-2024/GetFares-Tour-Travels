import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createHistoryRoutes({
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
    authorize("leads:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.get(
    "/",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );

  return router;
}

export { createHistoryRoutes };
