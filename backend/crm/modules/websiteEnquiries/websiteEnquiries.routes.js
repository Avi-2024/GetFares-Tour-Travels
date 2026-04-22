import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createWebsiteEnquiriesRoutes({
  controller,
  validation,
  validateRequest,
}) {
  const router = Router();

  router.post(
    "/capture",
    validateRequest(validation.capture),
    asyncHandler(controller.capture),
  );

  return router;
}

export { createWebsiteEnquiriesRoutes };
