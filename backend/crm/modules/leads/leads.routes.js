import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createLeadsRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  optionalAuth,
  authorize,
}) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/stats",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.stats),
    asyncHandler(controller.listStats),
  );
  router.get(
    "/destinations",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listDestinations),
    asyncHandler(controller.listDestinations),
  );
  router.get(
    "/custom-status-presets",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listCustomStatusPresets),
    asyncHandler(controller.listCustomStatusPresets),
  );
  router.post(
    "/custom-status-presets",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.addCustomStatusPreset),
    asyncHandler(controller.addCustomStatusPreset),
  );
  router.post(
    "/",
    requireAuth,
    authorize("leads:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.post(
    "/public-capture",
    optionalAuth,
    validateRequest(validation.create),
    asyncHandler(controller.publicCapture),
  );

  router.post(
    "/distribute",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.distribute),
    asyncHandler(controller.distribute),
  );

  router.post(
    "/reassign-inactive",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.reassignInactive),
    asyncHandler(controller.reassignInactive),
  );

  router.get(
    "/followups/overdue",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listOverdueFollowups),
    asyncHandler(controller.listOverdueFollowups),
  );

  router.post(
    "/followups/process-overdue",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.processOverdueFollowups),
    asyncHandler(controller.processOverdueFollowups),
  );

  router.post(
    "/sla/process-breaches",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.processSlaBreaches),
    asyncHandler(controller.processSlaBreaches),
  );

  router.post(
    "/followups/process-non-responsive",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.processNonResponsive),
    asyncHandler(controller.processNonResponsive),
  );

  router.post(
    "/followups/process-cadence-automation",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.processCadenceAutomation),
    asyncHandler(controller.processCadenceAutomation),
  );

  // Static segment routes must be registered before `/:id` so paths like
  // `/:id/followups` are never mistaken for a single-param route.
  router.post(
    "/:id/assign",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.assign),
    asyncHandler(controller.assign),
  );

  router.post(
    "/:id/disable-calls",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.disableCalls),
    asyncHandler(controller.disableCalls),
  );

  router.post(
    "/:id/followups",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.createFollowup),
    asyncHandler(controller.createFollowup),
  );
  router.get(
    "/:id/followups",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listFollowupsByLeadId),
    asyncHandler(controller.listFollowups),
  );

  router.get(
    "/:id",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("leads:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

export { createLeadsRoutes };
