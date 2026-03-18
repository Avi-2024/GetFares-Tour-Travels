import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createAuthRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
}) {
  const router = Router();

  router.post(
    "/register",
    validateRequest(validation.register),
    asyncHandler(controller.register),
  );
  router.post(
    "/login",
    validateRequest(validation.login),
    asyncHandler(controller.login),
  );
  router.get("/me", requireAuth, asyncHandler(controller.me));

  return router;
}

export { createAuthRoutes };
