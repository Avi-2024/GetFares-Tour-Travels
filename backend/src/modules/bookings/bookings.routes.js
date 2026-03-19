import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createBookingsRoutes({
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
    authorize("bookings:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/stats",
    requireAuth,
    authorize("bookings:read"),
    validateRequest(validation.stats),
    asyncHandler(controller.stats),
  );
  router.post(
    "/",
    requireAuth,
    authorize("bookings:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.get(
    "/:id/status-history",
    requireAuth,
    authorize("bookings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.listStatusHistory),
  );
  router.get(
    "/:id/invoices",
    requireAuth,
    authorize("bookings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.listInvoices),
  );
  router.post(
    "/:id/invoices/generate",
    requireAuth,
    authorize("bookings:update"),
    validateRequest(validation.generateInvoice),
    asyncHandler(controller.generateInvoice),
  );
  router.post(
    "/:id/status",
    requireAuth,
    authorize("bookings:update"),
    validateRequest(validation.transitionStatus),
    asyncHandler(controller.transitionStatus),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("bookings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("bookings:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

export { createBookingsRoutes };
