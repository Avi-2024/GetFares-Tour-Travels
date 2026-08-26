import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

// Creates Breezer integration routes.
function createBreezerIntegrationRoutes({
  controller,
  requireAuth,
  authorize,
  validateRequest,
  validation,
}) {
  const router = Router();

  router.get(
    "/bookings/:id/payload",
    requireAuth,
    authorize(["bookings:read"]),
    validateRequest(validation.byId),
    asyncHandler(controller.previewBookingPayload),
  );

  router.post(
    "/bookings/:id/test",
    requireAuth,
    authorize(["bookings:read", "bookings:update"]),
    validateRequest(validation.byId),
    asyncHandler(controller.testBooking),
  );

  router.get(
    "/bookings/:id/visa-payload",
    requireAuth,
    authorize(["bookings:read"]),
    validateRequest(validation.byId),
    asyncHandler(controller.previewVisaPayload),
  );

  router.post(
    "/bookings/:id/visa-test",
    requireAuth,
    authorize(["bookings:read", "bookings:update"]),
    validateRequest(validation.byId),
    asyncHandler(controller.testVisa),
  );

  router.get(
    "/payments/:id/payload",
    requireAuth,
    authorize(["payments:read"]),
    validateRequest(validation.byIdWithEventType),
    asyncHandler(controller.previewPaymentPayload),
  );

  router.post(
    "/payments/:id/test",
    requireAuth,
    authorize(["payments:read", "payments:update"]),
    validateRequest(validation.byIdWithEventType),
    asyncHandler(controller.testPayment),
  );

  router.get(
    "/refunds/:id/payload",
    requireAuth,
    authorize(["refunds:read"]),
    validateRequest(validation.byIdWithEventType),
    asyncHandler(controller.previewRefundPayload),
  );

  router.post(
    "/refunds/:id/test",
    requireAuth,
    authorize(["refunds:read", "refunds:update"]),
    validateRequest(validation.byIdWithEventType),
    asyncHandler(controller.testRefund),
  );

  return router;
}

export { createBreezerIntegrationRoutes };
