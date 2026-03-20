import { Router } from "express";
import { asyncHandler } from "../../core/utils/index.js";

function createRbacRoutes({
  controller,
  validation,
  validateRequest,
  requireAuth,
  authorize,
}) {
  const adminRouter = Router();
  const permissionsRouter = Router();
  const rolesRouter = Router();

  // Backward-compatible RBAC admin endpoints
  adminRouter.post(
    "/assign",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.assignRole),
    asyncHandler(controller.assignRole),
  );
  adminRouter.get(
    "/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.listPermissions),
    asyncHandler(controller.listPermissions),
  );
  adminRouter.post(
    "/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.createPermission),
    asyncHandler(controller.createPermission),
  );
  adminRouter.patch(
    "/permissions/:id",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updatePermission),
    asyncHandler(controller.updatePermission),
  );
  adminRouter.get(
    "/roles",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.listRoles),
    asyncHandler(controller.listRoles),
  );
  adminRouter.post(
    "/roles",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.createRole),
    asyncHandler(controller.createRole),
  );
  adminRouter.patch(
    "/roles/:id",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updateRole),
    asyncHandler(controller.updateRole),
  );
  adminRouter.patch(
    "/roles/:id/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updateRolePermissions),
    asyncHandler(controller.updateRolePermissions),
  );
  adminRouter.get(
    "/roles/:id/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.rolePermissionsById),
    asyncHandler(controller.getRolePermissionsById),
  );
  adminRouter.get(
    "/roles/:role/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.rolePermissionsByRole),
    asyncHandler(controller.getRolePermissions),
  );
  adminRouter.put(
    "/roles/:role/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.setRolePermissions),
    asyncHandler(controller.setRolePermissions),
  );
  adminRouter.get(
    "/me/permissions",
    requireAuth,
    validateRequest(validation.me),
    asyncHandler(controller.myPermissions),
  );

  // Required public management endpoints for admin panel
  permissionsRouter.get(
    "/",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.listPermissions),
    asyncHandler(controller.listPermissions),
  );
  permissionsRouter.post(
    "/",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.createPermission),
    asyncHandler(controller.createPermission),
  );
  permissionsRouter.patch(
    "/:id",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updatePermission),
    asyncHandler(controller.updatePermission),
  );

  rolesRouter.get(
    "/",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.listRoles),
    asyncHandler(controller.listRoles),
  );
  rolesRouter.post(
    "/",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.createRole),
    asyncHandler(controller.createRole),
  );
  rolesRouter.patch(
    "/:id",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updateRole),
    asyncHandler(controller.updateRole),
  );
  rolesRouter.patch(
    "/:id/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.updateRolePermissions),
    asyncHandler(controller.updateRolePermissions),
  );
  rolesRouter.get(
    "/:id/permissions",
    requireAuth,
    authorize("rbac:manage"),
    validateRequest(validation.rolePermissionsById),
    asyncHandler(controller.getRolePermissionsById),
  );

  return Object.freeze({
    adminRouter,
    permissionsRouter,
    rolesRouter,
  });
}

export { createRbacRoutes };
