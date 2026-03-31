import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createDestinationsRoutes({
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
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    requireAuth,
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.createDestination),
    asyncHandler(controller.createDestination),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updateDestination),
    asyncHandler(controller.updateDestination),
  );

  router.get(
    "/:id/pricing",
    requireAuth,
    validateRequest(validation.listPricing),
    asyncHandler(controller.listPricing),
  );
  router.post(
    "/:id/pricing",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.createPricing),
    asyncHandler(controller.createPricing),
  );
  router.patch(
    "/pricing/:pricingId",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.updatePricing),
    asyncHandler(controller.updatePricing),
  );

  return router;
}

export { createDestinationsRoutes };
