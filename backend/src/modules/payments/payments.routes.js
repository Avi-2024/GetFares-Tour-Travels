import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";
import { createMemoryUpload } from "../../core/uploads/index.js";

function createPaymentsRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
  config,
}) {
  const router = Router();
  const upload = createMemoryUpload({
    maxFileSizeMb: config?.uploads?.maxFileSizeMb,
  });

  router.get(
    "/",
    requireAuth,
    authorize("payments:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/stats",
    requireAuth,
    authorize("payments:read"),
    validateRequest(validation.stats),
    asyncHandler(controller.stats),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("payments:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("payments:create"),
    upload.single("file"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("payments:update"),
    upload.single("file"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.post(
    "/:id/verify",
    requireAuth,
    authorize("payments:update"),
    upload.single("file"),
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  return router;
}

export { createPaymentsRoutes };
