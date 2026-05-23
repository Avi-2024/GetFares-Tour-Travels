import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";
import { AppError } from "../../core/errors/index.js";
import { isSuperAdminRole } from "../../core/constants/index.js";

function createMetaLeadMappingRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
}) {
  const router = Router();

  const requireSuperAdmin = (req, _res, next) => {
    if (isSuperAdminRole(req.context?.user?.role)) {
      return next();
    }
    return next(
      new AppError(
        403,
        "Only super admin can manage Meta lead mappings",
        "META_MAP_SUPERADMIN_REQUIRED",
      ),
    );
  };

  router.use(requireAuth, requireSuperAdmin);

  router.get("/metadata", asyncHandler(controller.getMetadata));

  router.get(
    "/profiles",
    validateRequest(validation.listProfiles),
    asyncHandler(controller.listProfiles),
  );

  router.get(
    "/profiles/:id",
    validateRequest(validation.getProfile),
    asyncHandler(controller.getProfile),
  );

  router.post(
    "/profiles",
    validateRequest(validation.createProfile),
    asyncHandler(controller.createProfile),
  );

  router.patch(
    "/profiles/:id",
    validateRequest(validation.updateProfile),
    asyncHandler(controller.updateProfile),
  );

  router.post(
    "/profiles/:profileId/field-maps",
    validateRequest(validation.createFieldMap),
    asyncHandler(controller.createFieldMap),
  );

  router.patch(
    "/field-maps/:id",
    validateRequest(validation.updateFieldMap),
    asyncHandler(controller.updateFieldMap),
  );

  router.delete(
    "/field-maps/:id",
    validateRequest(validation.deleteFieldMap),
    asyncHandler(controller.deleteFieldMap),
  );

  router.post(
    "/test",
    validateRequest(validation.testMap),
    asyncHandler(controller.testMapping),
  );

  router.post("/reload-cache", asyncHandler(controller.reloadCache));

  return router;
}

export { createMetaLeadMappingRoutes };
