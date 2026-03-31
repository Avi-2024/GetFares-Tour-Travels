import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createPackagesRoutes({
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
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );

  router.post(
    "/",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.get(
    "/:id",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );

  router.patch(
    "/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  router.post(
    "/:id/publish",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.publish),
    asyncHandler(controller.publish),
  );

  router.get(
    "/:id/enquiries",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listEnquiries),
    asyncHandler(controller.listEnquiries),
  );

  router.post(
    "/:id/enquiries",
    requireAuth,
    authorize("leads:create"),
    validateRequest(validation.createEnquiry),
    asyncHandler(controller.createEnquiry),
  );

  return router;
}

export { createPackagesRoutes };
