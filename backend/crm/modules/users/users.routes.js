import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createUsersRoutes({
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
    authorize("users:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/roles",
    requireAuth,
    authorize("users:read"),
    validateRequest(validation.listRoles),
    asyncHandler(controller.listRoles),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("users:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("users:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("users:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

export { createUsersRoutes };
