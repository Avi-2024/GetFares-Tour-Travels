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
    "/payables/:payableId/settlements",
    requireAuth,
    authorize("suppliers:read"),
    validateRequest(validation.listPayableSettlements),
    asyncHandler(controller.listPayableSettlements),
  );

  router.post(
    "/payables/:payableId/settlements",
    requireAuth,
    authorize("suppliers:update"),
    validateRequest(validation.settlePayable),
    asyncHandler(controller.settlePayable),
  );

  router.post(
    "/payables/process-deadline-alerts",
    requireAuth,
    authorize("suppliers:update"),
    validateRequest(validation.processPayableDeadlineAlerts),
    asyncHandler(controller.processPayableDeadlineAlerts),
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

  router.get(
    "/:id/settlements",
    requireAuth,
    authorize("suppliers:read"),
    validateRequest(validation.listSupplierSettlements),
    asyncHandler(controller.listSupplierSettlements),
  );

  router.get(
    "/:id/bookings",
    requireAuth,
    authorize("suppliers:read"),
    validateRequest(validation.listSupplierBookings),
    asyncHandler(controller.listSupplierBookings),
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
