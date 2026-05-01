import { AppError } from "../../core/errors/index.js";

function matchesPermission(granted, permissionKey) {
  if (granted === "*") return true;
  if (granted === permissionKey) return true;
  if (granted.endsWith(":*")) {
    const [scope] = granted.split(":");
    return permissionKey.startsWith(`${scope}:`);
  }
  return false;
}

function createRbacMiddleware({ rbacService }) {
  /** Single key, or any-of (OR) when an array is passed */
  function authorize(permissionKeyOrKeys) {
    const keys = Array.isArray(permissionKeyOrKeys)
      ? permissionKeyOrKeys
      : [permissionKeyOrKeys];

    return async (req, res, next) => {
      try {
        if (!req.context?.user) {
          return next(
            new AppError(401, "Authentication required", "AUTH_REQUIRED"),
          );
        }

        const access = await rbacService.getPermissionsForUser(req.context.user);
        const allowed = keys.some((permissionKey) =>
          access.permissions.some((granted) =>
            matchesPermission(granted, permissionKey),
          ),
        );

        if (!allowed) {
          return next(
            new AppError(
              403,
              `Missing permission: ${keys.join(" | ")}`,
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
