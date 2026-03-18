import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createMetaWebhookRoutes({ controller, validation, validateRequest }) {
  const router = Router();

  router.get(
    "/meta",
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  router.post(
    "/meta",
    validateRequest(validation.receive),
    asyncHandler(controller.receive),
  );

  return router;
}

export { createMetaWebhookRoutes };
