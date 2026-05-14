import express, { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createMetaWebhookRoutes({ controller, validation, validateRequest }) {
  const router = Router();
  const rawParser = express.raw({ type: "*/*" });

  function parseRawBody(req, _res, next) {
    console.log("\n========== parseRawBody middleware ==========");
    console.log("Body is Buffer:", Buffer.isBuffer(req.body));
    console.log("Body type:", typeof req.body);
    
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString("utf8");
      req.rawBody = raw;
      console.log("Raw body length:", raw.length);
      console.log("Raw body preview:", raw.substring(0, 200));
      
      try {
        req.body = JSON.parse(raw);
        console.log("Parsed body successfully");
      } catch (_error) {
        console.error("Failed to parse body as JSON:", _error.message);
        req.body = {};
      }
    } else {
      console.log("Body is not a Buffer, skipping raw body parsing");
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

  console.log("Meta webhook routes registered:");
  console.log("  GET  /meta - verification");
  console.log("  POST /meta - receive webhook");

  return router;
}

export { createMetaWebhookRoutes };
