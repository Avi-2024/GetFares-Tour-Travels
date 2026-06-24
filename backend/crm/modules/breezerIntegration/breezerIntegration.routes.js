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

  router.post(
    "/bookings/:id/test",
    requireAuth,
    authorize(["bookings:read", "bookings:update"]),
    validateRequest(validation.byId),
    asyncHandler(controller.testBooking),
  );

  return router;
}

export { createBreezerIntegrationRoutes };
