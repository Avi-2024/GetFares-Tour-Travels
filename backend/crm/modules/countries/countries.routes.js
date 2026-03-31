import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createCountriesRoutes({
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
  router.get(
    "/:id",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

export { createCountriesRoutes };
