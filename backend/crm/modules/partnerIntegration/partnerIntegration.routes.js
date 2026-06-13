import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createPartnerIntegrationRoutes({
  controller,
  requirePartnerApiKey,
  requireScope,
  validateRequest,
  validation,
}) {
  const router = Router();
  router.use(requirePartnerApiKey);
  router.get("/health", asyncHandler(controller.health));
  router.get(
    "/changes",
    requireScope("changes:read"),
    validateRequest(validation.changes),
    asyncHandler(controller.changes),
  );
  router.get(
    "/customers/:id",
    requireScope("customers:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.customer),
  );
  router.get(
    "/leads/:id",
    requireScope("leads:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.lead),
  );
  router.get(
    "/bookings/:id",
    requireScope("bookings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.booking),
  );
  router.get(
    "/webhook-endpoints",
    requireScope("webhooks:manage"),
    asyncHandler(controller.listWebhookEndpoints),
  );
  router.post(
    "/webhook-endpoints",
    requireScope("webhooks:manage"),
    validateRequest(validation.createWebhookEndpoint),
    asyncHandler(controller.createWebhookEndpoint),
  );
  router.patch(
    "/webhook-endpoints/:id",
    requireScope("webhooks:manage"),
    validateRequest(validation.updateWebhookEndpoint),
    asyncHandler(controller.updateWebhookEndpoint),
  );
  router.post(
    "/webhook-endpoints/:id/test",
    requireScope("webhooks:manage"),
    validateRequest(validation.byId),
    asyncHandler(controller.testWebhookEndpoint),
  );
  router.get(
    "/webhook-deliveries",
    requireScope("deliveries:read"),
    validateRequest(validation.listWebhookDeliveries),
    asyncHandler(controller.listWebhookDeliveries),
  );
  router.post(
    "/webhook-deliveries/:id/retry",
    requireScope("deliveries:retry"),
    validateRequest(validation.byId),
    asyncHandler(controller.retryWebhookDelivery),
  );
  router.post(
    "/webhook-deliveries/diagnostic",
    requireScope("webhooks:manage"),
    asyncHandler(controller.queueDiagnosticWebhook),
  );
  return router;
}

export { createPartnerIntegrationRoutes };
