import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";
import { AppError } from "../../core/errors/index.js";
import { canManageMetaConfiguration } from "../../core/constants/index.js";

function createMetaPageConfigRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
}) {
  const router = Router();

  const requireMetaConfigAccess = (req, _res, next) => {
    if (canManageMetaConfiguration(req.context?.user?.role)) {
      return next();
    }
    return next(
      new AppError(
        403,
        "Only admin or super admin can manage Meta connection settings",
        "META_CONN_ACCESS_DENIED",
      ),
    );
  };

  router.use(requireAuth, requireMetaConfigAccess);

  router.get("/integration", asyncHandler(controller.getIntegration));
  router.patch(
    "/integration",
    validateRequest(validation.updateIntegration),
    asyncHandler(controller.updateIntegration),
  );

  router.get(
    "/pages",
    validateRequest(validation.listPages),
    asyncHandler(controller.listPages),
  );
  router.get(
    "/pages/:id",
    validateRequest(validation.getPage),
    asyncHandler(controller.getPage),
  );
  router.post(
    "/pages",
    validateRequest(validation.createPage),
    asyncHandler(controller.createPage),
  );
  router.patch(
    "/pages/:id",
    validateRequest(validation.updatePage),
    asyncHandler(controller.updatePage),
  );
  router.delete(
    "/pages/:id",
    validateRequest(validation.deletePage),
    asyncHandler(controller.deletePage),
  );

  return router;
}

export { createMetaPageConfigRoutes };
