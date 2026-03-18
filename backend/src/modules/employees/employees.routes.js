const { Router } = require("express");
const { asyncHandler } = require("../../core/utils");

function createEmployeesRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const router = Router();

  router.get(
    "/directory",
    requireAuth,
    authorize("employees:read"),
    validateRequest(validation.directory),
    asyncHandler(controller.directory),
  );
  router.post(
    "/attendance/check-in",
    requireAuth,
    authorize("employees:update"),
    validateRequest(validation.checkIn),
    asyncHandler(controller.checkIn),
  );
  router.post(
    "/attendance/check-out",
    requireAuth,
    authorize("employees:update"),
    validateRequest(validation.checkOut),
    asyncHandler(controller.checkOut),
  );
  router.get(
    "/attendance",
    requireAuth,
    authorize("employees:read"),
    validateRequest(validation.listAttendance),
    asyncHandler(controller.listAttendance),
  );

  router.get(
    "/leaves",
    requireAuth,
    authorize("employees:read"),
    validateRequest(validation.listLeaves),
    asyncHandler(controller.listLeaves),
  );
  router.post(
    "/leaves",
    requireAuth,
    authorize("employees:update"),
    validateRequest(validation.createLeave),
    asyncHandler(controller.createLeave),
  );
  router.patch(
    "/leaves/:id/status",
    requireAuth,
    authorize("employees:update"),
    validateRequest(validation.updateLeaveStatus),
    asyncHandler(controller.updateLeaveStatus),
  );

  return router;
}

module.exports = { createEmployeesRoutes };
