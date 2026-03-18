import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createRbacRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.post(
    "/assign",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.assignRole),
    asyncHandler(controller.assignRole),
  );
  router.get(
    "/me/permissions",
    requireAuth,
    asyncHandler(controller.myPermissions),
  );

  return router;
}

export { createRbacRoutes };
