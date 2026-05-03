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
    "/payment-options",
    requireAuth,
    authorize("customers:read"),
    asyncHandler(controller.getPaymentOptions),
  );
  router.get(
    "/:id/leads",
    requireAuth,
    authorize("customers:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getLeads),
  );
  router.get(
    "/:id/bookings",
    requireAuth,
    authorize("customers:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getBookings),
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
