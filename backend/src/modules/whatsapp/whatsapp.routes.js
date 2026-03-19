import express, { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createWhatsappRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.post(
    "/send",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.sendText),
    asyncHandler(controller.sendText),
  );

  router.post(
    "/send-template",
    requireAuth,
    authorize("notifications:update"),
    validateRequest(validation.sendTemplate),
    asyncHandler(controller.sendTemplate),
  );

  return router;
}

function createWhatsappWebhookRoutes({
  controller,
  validation,
  validateRequest,
}) {
  const router = Router();
  const rawParser = express.raw({ type: "*/*" });

  function parseRawBody(req, _res, next) {
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString("utf8");
      req.rawBody = raw;
      try {
        req.body = JSON.parse(raw);
      } catch (_error) {
        req.body = {};
      }
    }
    next();
  }

  router.get(
    "/",
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  router.post(
    "/",
    rawParser,
    parseRawBody,
    validateRequest(validation.receive),
    asyncHandler(controller.receive),
  );

  return router;
}

export { createWhatsappRoutes, createWhatsappWebhookRoutes };
