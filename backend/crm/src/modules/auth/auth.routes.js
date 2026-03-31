import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";
import { 
  createAuthRateLimiter, 
  createRegisterRateLimiter 
} from "../../core/middlewares/rateLimiter.js";

function createAuthRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
}) {
  const router = Router();
  const loginLimiter = createAuthRateLimiter();
  const registerLimiter = createRegisterRateLimiter();

  router.post(
    "/register",
    registerLimiter,
    validateRequest(validation.register),
    asyncHandler(controller.register),
  );
  router.post(
    "/login",
    loginLimiter,
    validateRequest(validation.login),
    asyncHandler(controller.login),
  );
  router.get("/me", requireAuth, asyncHandler(controller.me));
  router.post("/toggle-active", requireAuth, asyncHandler(controller.toggleActive));
  router.post("/logout", requireAuth, asyncHandler(controller.logout));

  return router;
}

export { createAuthRoutes };
