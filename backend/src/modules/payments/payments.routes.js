import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createPaymentsRoutes({
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
    authorize("payments:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("payments:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("payments:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("payments:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.post(
    "/:id/verify",
    requireAuth,
    authorize("payments:update"),
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  return router;
}

export { createPaymentsRoutes };
