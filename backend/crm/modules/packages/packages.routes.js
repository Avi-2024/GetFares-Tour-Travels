import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createPackagesRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  // CMS-like package categories (main/sub) under CRM /api
  router.get(
    "/main",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.mainList),
    asyncHandler(controller.listMain),
  );
  router.post(
    "/main",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.mainCreate),
    asyncHandler(controller.createMain),
  );
  router.get(
    "/main/:id",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.mainById),
    asyncHandler(controller.getMainById),
  );
  router.put(
    "/main/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.mainUpdate),
    asyncHandler(controller.updateMain),
  );
  router.delete(
    "/main/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.mainById),
    asyncHandler(controller.deleteMain),
  );
  router.patch(
    "/main/:id/restore",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.mainRestore),
    asyncHandler(controller.restoreMain),
  );
  router.delete(
    "/main/:id/hard-delete",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.mainHardDelete),
    asyncHandler(controller.hardDeleteMain),
  );

  router.get(
    "/main/:mainPackageId/sub",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.subList),
    asyncHandler(controller.listSub),
  );
  router.post(
    "/sub",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.subCreate),
    asyncHandler(controller.createSub),
  );
  router.get(
    "/sub/:id",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.subById),
    asyncHandler(controller.getSubById),
  );
  router.put(
    "/sub/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.subUpdate),
    asyncHandler(controller.updateSub),
  );
  router.delete(
    "/sub/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.subById),
    asyncHandler(controller.deleteSub),
  );
  router.patch(
    "/sub/:id/restore",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.subRestore),
    asyncHandler(controller.restoreSub),
  );
  router.delete(
    "/sub/:id/hard-delete",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.subHardDelete),
    asyncHandler(controller.hardDeleteSub),
  );

  router.get(
    "/",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.list),
    asyncHandler(controller.list),
  );

  router.post(
    "/",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.create),
    asyncHandler(controller.create),
  );

  router.get(
    "/:id",
    requireAuth,
    authorize("settings:read"),
    validateRequest(validation.byId),
    asyncHandler(controller.getById),
  );

  router.patch(
    "/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.update),
    asyncHandler(controller.update),
  );

  router.post(
    "/:id/publish",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.publish),
    asyncHandler(controller.publish),
  );

  router.delete(
    "/:id",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.delete ?? validation.byId),
    asyncHandler(controller.delete),
  );

  router.patch(
    "/:id/restore",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.restore ?? validation.byId),
    asyncHandler(controller.restore),
  );

  router.delete(
    "/:id/hard-delete",
    requireAuth,
    authorize("settings:update"),
    validateRequest(validation.hardDelete ?? validation.byId),
    asyncHandler(controller.hardDelete),
  );

  router.get(
    "/:id/enquiries",
    requireAuth,
    authorize("leads:read"),
    validateRequest(validation.listEnquiries),
    asyncHandler(controller.listEnquiries),
  );

  router.post(
    "/:id/enquiries",
    requireAuth,
    authorize("leads:create"),
    validateRequest(validation.createEnquiry),
    asyncHandler(controller.createEnquiry),
  );

  return router;
}

export { createPackagesRoutes };
