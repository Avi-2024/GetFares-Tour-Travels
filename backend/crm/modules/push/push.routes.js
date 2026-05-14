import express from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createPushRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = express.Router();

  router.get(
    "/public-key",
    validateRequest(validation.publicKey),
    asyncHandler(controller.publicKey),
  );

  router.get(
    "/",
    requireAuth,
    authorize("notifications:read"),
    validateRequest(validation.listMine),
    asyncHandler(controller.listMine),
  );

  router.post(
    "/subscribe",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.subscribe),
    asyncHandler(controller.subscribe),
  );

  router.post(
    "/unsubscribe",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.unsubscribe),
    asyncHandler(controller.unsubscribe),
  );

  return router;
}

export { createPushRoutes };

