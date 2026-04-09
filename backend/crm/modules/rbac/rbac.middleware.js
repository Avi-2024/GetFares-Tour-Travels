import { AppError } from "../../core/errors/index.js";

function createRbacMiddleware({ rbacService }) {
  function authorize(permissionKey) {
    return async (req, res, next) => {
      try {
        if (!req.context?.user) {
          return next(
            new AppError(401, "Authentication required", "AUTH_REQUIRED"),
          );
        }

        const access = await rbacService.getPermissionsForUser(req.context.user);
        const allowed = access.permissions.some((granted) => {
          if (granted === "*") return true;
          if (granted === permissionKey) return true;
          if (granted.endsWith(":*")) {
            const [scope] = granted.split(":");
            return permissionKey.startsWith(`${scope}:`);
          }
          return false;
        });

        if (!allowed) {
          return next(
            new AppError(
              403,
              `Missing permission: ${permissionKey}`,
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

        console.error("[RBAC Middleware Error]", error);
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
