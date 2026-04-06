import { AppError } from "../../../crm/core/errors/index.js";

const CMS_ROLE_NAME = "CMS_ACCESS";

function normalizeRoleName(roleName) {
  return String(roleName || "")
    .trim()
    .toUpperCase();
}

function createCmsAccessMiddleware({ db, requiredRole = CMS_ROLE_NAME }) {
  const normalizedRequiredRole = normalizeRoleName(requiredRole);

  async function resolveUserRole(userId, fallbackRoleName, fallbackRoleId) {
    if (!userId) {
      return null;
    }

    if (typeof db?.query === "function") {
      const result = await db.query(
        `
          SELECT
            u.id,
            u.email,
            u.is_active AS "isActive",
            u.role_id AS "roleId",
            r.name AS "roleName"
          FROM users u
          LEFT JOIN roles r ON r.id = u.role_id
          WHERE u.id = $1
          LIMIT 1
        `,
        [userId],
      );

      if (result.rowCount > 0) {
        return result.rows[0];
      }
    }

    const userRecord = await db?.findById?.("users", userId);
    if (!userRecord) {
      return null;
    }

    let roleName = fallbackRoleName || null;
    let roleId = userRecord.role_id || userRecord.roleId || fallbackRoleId || null;

    if (!roleName && roleId) {
      const roleRecord = await db?.findById?.("roles", roleId);
      roleName = roleRecord?.name || null;
    }

    return {
      id: userRecord.id,
      email: userRecord.email,
      isActive: userRecord.is_active ?? userRecord.isActive ?? true,
      roleId,
      roleName,
    };
  }

  return async function requireCmsAccess(req, _res, next) {
    try {
      if (!req.context?.user?.id) {
        return next(
          new AppError(401, "Authentication required", "AUTH_REQUIRED"),
        );
      }

      const roleContext = await resolveUserRole(
        req.context.user.id,
        req.context.user.role,
        req.context.user.roleId,
      );

      if (!roleContext) {
        return next(
          new AppError(
            401,
            "Authenticated user was not found",
            "AUTH_USER_NOT_FOUND",
          ),
        );
      }

      if (roleContext.isActive === false) {
        return next(
          new AppError(403, "User account is inactive", "AUTH_INACTIVE_USER"),
        );
      }

      const resolvedRoleName = normalizeRoleName(roleContext.roleName);
      if (resolvedRoleName !== normalizedRequiredRole) {
        return next(
          new AppError(
            403,
            `CMS access requires role: ${requiredRole}`,
            "CMS_ROLE_REQUIRED",
          ),
        );
      }

      req.context.user.role = roleContext.roleName || req.context.user.role;
      req.context.user.roleId = roleContext.roleId || req.context.user.roleId;

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export { createCmsAccessMiddleware, CMS_ROLE_NAME };
