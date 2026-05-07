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
  const paymentUploadFields = upload.fields([
    { name: "file", maxCount: 1 }, // legacy proof field
    { name: "proofFile", maxCount: 1 },
    { name: "invoiceFile", maxCount: 1 },
  ]);

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
  router.get(
    "/:id/attachments/:attachmentType",
    requireAuth,
    authorize("payments:read"),
    validateRequest(validation.downloadAttachment),
    asyncHandler(controller.downloadAttachment),
  );
  router.post(
    "/",
    requireAuth,
    authorize("payments:create"),
    paymentUploadFields,
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    requireAuth,
    authorize("payments:update"),
    paymentUploadFields,
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );
  router.post(
    "/:id/verify",
    requireAuth,
    authorize("payments:update"),
    paymentUploadFields,
    validateRequest(validation.verify),
    asyncHandler(controller.verify),
  );

  return router;
}

export { createPaymentsRoutes };
