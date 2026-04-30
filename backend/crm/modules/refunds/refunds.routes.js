import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";
import { createMemoryUpload } from "../../core/uploads/index.js";

function createRefundsRoutes({
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
  const refundUploadFields = upload.fields([
    { name: "file", maxCount: 1 },
    { name: "proofFile", maxCount: 1 },
  ]);

  router.get(
    "/",
    requireAuth,
    authorize("refunds:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );
  router.get(
    "/assignable-users",
    requireAuth,
    authorize("refunds:create"),
    validateRequest(validation.assignableUsers),
    asyncHandler(controller.listAssignableUsers),
  );
  router.get(
    "/:id",
    requireAuth,
    authorize("refunds:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );
  router.post(
    "/",
    requireAuth,
    authorize("refunds:create"),
    refundUploadFields,
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("refunds:update"),
    refundUploadFields,
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.post(
    "/:id/approve",
    requireAuth,
    authorize("refunds:update"),
    validateRequest(validation.approve),
    asyncHandler(controller.approve),
  );
  router.post(
    "/:id/reject",
    requireAuth,
    authorize("refunds:update"),
    validateRequest(validation.reject),
    asyncHandler(controller.reject),
  );
  router.post(
    "/:id/process",
    requireAuth,
    authorize("refunds:update"),
    validateRequest(validation.process),
    asyncHandler(controller.process),
  );

  return router;
}

export { createRefundsRoutes };
