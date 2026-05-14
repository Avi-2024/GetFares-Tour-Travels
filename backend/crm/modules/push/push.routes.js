import express from "express";

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
    controller.publicKey,
  );

  router.get(
    "/",
    requireAuth,
    authorize("notifications:read"),
    validateRequest(validation.listMine),
    controller.listMine,
  );

  router.post(
    "/subscribe",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.subscribe),
    controller.subscribe,
  );

  router.post(
    "/unsubscribe",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.unsubscribe),
    controller.unsubscribe,
  );

  return router;
}

export { createPushRoutes };

