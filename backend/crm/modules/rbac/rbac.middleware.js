import { AppError } from "../../core/errors/index.js";

function createRbacMiddleware({ rbacService, logger }) {
  function authorize(permissionKey) {
    return async (req, res, next) => {
      try {
        if (!req.context?.user) {
          return next(
            new AppError(401, "Authentication required", "AUTH_REQUIRED"),
          );
        }

        const normalizedPermissionKey = String(permissionKey || "").trim();
        if (!normalizedPermissionKey) {
          return next(
            new AppError(
              500,
              "Authorization middleware requires a permission key",
              "RBAC_PERMISSION_KEY_REQUIRED",
            ),
          );
        }

        const access = await rbacService.getPermissionsForUser(req.context.user);
        const allowed = access.permissions.some((granted) => {
          if (granted === "*") return true;
          if (granted === normalizedPermissionKey) return true;
          if (granted.endsWith(":*")) {
            const [scope] = granted.split(":");
            return normalizedPermissionKey.startsWith(`${scope}:`);
          }
          return false;
        });

        if (!allowed) {
          return next(
            new AppError(
              403,
              `Missing permission: ${normalizedPermissionKey}`,
              "RBAC_FORBIDDEN",
            ),
          );
        }

        req.context.user.roleId = access.roleId || req.context.user.roleId || null;
        req.context.user.role = access.role || req.context.user.role || null;
        req.context.permissions = access.permissions;

        return next();
      } catch (error) {
        if (error instanceof AppError) {
          return next(error);
        }

        const logContext = {
          err: error,
          permissionKey: String(permissionKey || ""),
          userId: req.context?.user?.id,
          roleId: req.context?.user?.roleId,
        };
        logger?.error?.(logContext, "RBAC authorization failure");
        req.log?.error?.(logContext, "RBAC authorization failure");

        return next(
          new AppError(
            503,
            "Authorization service temporarily unavailable. Please retry.",
            "RBAC_CHECK_UNAVAILABLE",
          ),
        );
      }
    };
  }

  return Object.freeze({ authorize });
}

export { createRbacMiddleware };
