import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createComplaintsRoutes({
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
    authorize("complaints:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("complaints:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.get(
    "/:id/activities",
    requireAuth,
    authorize("complaints:read"),
    validateRequest(validation.listActivities),
    asyncHandler(controller.listActivities),
  );
  router.get(
    "/:id/status-history",
    requireAuth,
    authorize("complaints:read"),
    validateRequest(validation.statusHistory),
    asyncHandler(controller.statusHistory),
  );
  router.post(
    "/",
    requireAuth,
    authorize("complaints:create"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.post(
    "/:id/activities",
    requireAuth,
    authorize("complaints:update"),
    validateRequest(validation.createActivity),
    asyncHandler(controller.createActivity),
  );
  router.post(
    "/:id/status",
    requireAuth,
    authorize("complaints:update"),
    validateRequest(validation.statusTransition),
    asyncHandler(controller.changeStatus),
  );
  router.post(
    "/:id/assign",
    requireAuth,
    authorize("complaints:update"),
    validateRequest(validation.assign),
    asyncHandler(controller.assign),
  );
  router.post(
    "/:id/escalate",
    requireAuth,
    authorize("complaints:update"),
    validateRequest(validation.escalate),
    asyncHandler(controller.escalate),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("complaints:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  return router;
}

export { createComplaintsRoutes };
