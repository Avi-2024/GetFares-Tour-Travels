import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createSuppliersRoutes({
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
    authorize("suppliers:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.post(
    "/",
    requireAuth,
    authorize("suppliers:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.patch(
    "/payables/:payableId",
    requireAuth,
    authorize("suppliers:update"),
    validateRequest(validation.updatePayable),
    asyncHandler(controller.updatePayable),
  );

  router.get(
    "/:id",
    requireAuth,
    authorize("suppliers:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("suppliers:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  router.get(
    "/:id/payables",
    requireAuth,
    authorize("suppliers:read"),
    validateRequest(validation.listPayables),
    asyncHandler(controller.listPayables),
  );

  router.post(
    "/:id/payables",
    requireAuth,
    authorize("suppliers:update"),
    validateRequest(validation.createPayable),
    asyncHandler(controller.createPayable),
  );

  return router;
}

export { createSuppliersRoutes };
