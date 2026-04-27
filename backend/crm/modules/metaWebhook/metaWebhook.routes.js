import express, { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createMetaWebhookRoutes({ controller, validation, validateRequest }) {
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
    "/meta",
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  router.post(
    "/meta",
    rawParser,
    parseRawBody,
    validateRequest(validation.receive),
    asyncHandler(controller.receive),
  );

  return router;
}

export { createMetaWebhookRoutes };
