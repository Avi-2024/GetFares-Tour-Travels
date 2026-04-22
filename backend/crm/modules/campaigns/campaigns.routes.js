import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createCampaignsRoutes({
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
    authorize("campaigns:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("campaigns:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("campaigns:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.post(
    "/:id/duplicate",
    requireAuth,
    authorize("campaigns:create"),
    validateRequest(validation.byId),
    asyncHandler(controller.duplicate),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("campaigns:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.delete(
    "/:id",
    requireAuth,
    authorize("campaigns:update"),
    validateRequest(validation.byId),
    asyncHandler(controller.remove),
  );

  return router;
}

export { createCampaignsRoutes };
