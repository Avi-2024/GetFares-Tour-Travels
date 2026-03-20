import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createCustomersRoutes({
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
    authorize("customers:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("customers:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("customers:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("customers:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.delete(
    "/:id",
    requireAuth,
    authorize("customers:update"),
    validateRequest(validation.remove),
    asyncHandler(controller.remove),
  );

  return router;
}

export { createCustomersRoutes };
