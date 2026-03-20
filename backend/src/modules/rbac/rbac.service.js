import { AppError } from "../../core/errors/index.js";

function createRbacService({
  repository,
  events,
  logger,
  cacheTtlMs = 60_000,
}) {
  const rolePermissionsCache = new Map();
  const userRoleCache = new Map();

  const normalizePermissionKeys = (permissionKeys = []) =>
    [...new Set(permissionKeys.map((value) => String(value || "").trim()))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));

  function getCached(cache, cacheKey) {
    const entry = cache.get(cacheKey);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      cache.delete(cacheKey);
      return null;
    }

    return entry.value;
  }

  function setCached(cache, cacheKey, value) {
    cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + cacheTtlMs,
    });
  }

  function invalidateRoleCache(roleId) {
    if (!roleId) return;
    rolePermissionsCache.delete(String(roleId));
  }

  function invalidateAllPermissionCaches() {
    rolePermissionsCache.clear();
  }

  function invalidateUserRoleCache(userId) {
    if (!userId) return;
    userRoleCache.delete(String(userId));
  }

  async function resolveRoleForUser(user) {
    if (!user?.id && !user?.roleId) {
      return {
        roleId: null,
        roleName: null,
      };
    }

    const directRoleId = user?.roleId ? String(user.roleId) : null;
    if (directRoleId && user?.role) {
      const resolved = {
        roleId: directRoleId,
        roleName: user.role,
      };
      if (user?.id) {
        setCached(userRoleCache, String(user.id), resolved);
      }
      return resolved;
    }

    if (directRoleId) {
      const role = await repository.findRoleById(directRoleId);
      const resolved = {
        roleId: directRoleId,
        roleName: role?.name || user?.role || null,
      };
      if (user?.id) {
        setCached(userRoleCache, String(user.id), resolved);
      }
      return resolved;
    }

    const cacheKey = String(user.id);
    const cached = getCached(userRoleCache, cacheKey);
    if (cached) {
      return cached;
    }

    const resolved = await repository.getRoleForUser(user.id);
    const normalized = {
      roleId: resolved?.roleId ? String(resolved.roleId) : null,
      roleName: resolved?.roleName || user?.role || null,
    };
    setCached(userRoleCache, cacheKey, normalized);
    return normalized;
  }

  async function getPermissionsByRoleId(roleId) {
    if (!roleId) return [];

    const cacheKey = String(roleId);
    const cached = getCached(rolePermissionsCache, cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = normalizePermissionKeys(
      await repository.getPermissionsByRoleId(roleId),
    );
    setCached(rolePermissionsCache, cacheKey, permissions);
    return permissions;
  }

  async function getPermissionsForUsersByRoleIds(rolesByUser) {
    const permissionsByUser = new Map();

    const roleIds = [...new Set(
      rolesByUser
        .map((entry) => entry.roleId)
        .filter(Boolean)
        .map((roleId) => String(roleId)),
    )];

    const unresolvedRoleIds = [];
    const permissionsByRoleId = new Map();

    roleIds.forEach((roleId) => {
      const cached = getCached(rolePermissionsCache, roleId);
      if (cached) {
        permissionsByRoleId.set(roleId, cached);
      } else {
        unresolvedRoleIds.push(roleId);
      }
    });

    if (unresolvedRoleIds.length) {
      const freshPermissions = await repository.getPermissionsByRoleIds(
        unresolvedRoleIds,
      );
      unresolvedRoleIds.forEach((roleId) => {
        const permissions = normalizePermissionKeys(
          freshPermissions.get(roleId) || [],
        );
        permissionsByRoleId.set(roleId, permissions);
        setCached(rolePermissionsCache, roleId, permissions);
      });
    }

    rolesByUser.forEach((entry) => {
      permissionsByUser.set(
        entry.userId,
        permissionsByRoleId.get(String(entry.roleId || "")) || [],
      );
    });

    return permissionsByUser;
  }

  function permissionMatches(granted, requiredPermission) {
    if (!granted || !requiredPermission) return false;
    if (granted === "*") return true;
    if (granted === requiredPermission) return true;
    if (granted.endsWith(":*")) {
      const [scope] = granted.split(":");
      return requiredPermission.startsWith(`${scope}:`);
    }
    return false;
  }

  return Object.freeze({
    clearCache() {
      invalidateAllPermissionCaches();
      userRoleCache.clear();
    },

    async assignRole({ userId, role, roleId }) {
      if (!userId) {
        throw new AppError(400, "userId is required", "RBAC_INVALID_INPUT");
      }
      if (!role && !roleId) {
        throw new AppError(
          400,
          "Either role or roleId is required",
          "RBAC_INVALID_INPUT",
        );
      }

      const assignment =
        roleId ?
          await repository.assignRoleById(userId, roleId)
        : await repository.assignRole(userId, role);

      if (!assignment) {
        throw new AppError(404, "User or role not found", "RBAC_ENTITY_NOT_FOUND");
      }

      invalidateUserRoleCache(userId);
      events.emitRoleAssigned?.(assignment);
      return assignment;
    },

    async listRoles({ includeInactive = true } = {}) {
      const rows = await repository.listRoles({ includeInactive });
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        isActive: row.is_active !== false,
      }));
    },

    async listPermissions({ includeInactive = true } = {}) {
      const rows = await repository.listPermissions({ includeInactive });
      return rows.map((row) => ({
        id: row.id,
        key: row.key,
        description: row.description ?? null,
        isActive: row.is_active !== false,
      }));
    },

    async createPermission(payload = {}) {
      const key = String(payload.key || "").trim();
      if (!key) {
        throw new AppError(
          400,
          "Permission key is required",
          "RBAC_PERMISSION_KEY_REQUIRED",
        );
      }

      const created = await repository.createPermission({
        key,
        description: payload.description ?? null,
        isActive: payload.isActive ?? true,
      });

      invalidateAllPermissionCaches();
      events.emitPermissionCreated?.(created);

      return {
        id: created.id,
        key: created.key,
        description: created.description ?? null,
        isActive: created.is_active !== false,
      };
    },

    async updatePermission(permissionId, payload = {}) {
      if (!permissionId) {
        throw new AppError(
          400,
          "Permission id is required",
          "RBAC_PERMISSION_ID_REQUIRED",
        );
      }

      const existing = await repository.findPermissionById(permissionId);
      if (!existing) {
        throw new AppError(
          404,
          "Permission not found",
          "RBAC_PERMISSION_NOT_FOUND",
        );
      }

      const updated = await repository.updatePermission(permissionId, {
        key:
          payload.key !== undefined ? String(payload.key || "").trim() : undefined,
        description: payload.description,
        isActive: payload.isActive,
      });

      invalidateAllPermissionCaches();
      events.emitPermissionUpdated?.(updated);

      return {
        id: updated.id,
        key: updated.key,
        description: updated.description ?? null,
        isActive: updated.is_active !== false,
      };
    },

    async getPermissionsForUser(user) {
      const roleInfo = await resolveRoleForUser(user);
      const permissions = await getPermissionsByRoleId(roleInfo.roleId);

      return {
        roleId: roleInfo.roleId,
        role: roleInfo.roleName,
        permissions,
      };
    },

    async getPermissionsForUserIds(userIds = []) {
      const normalizedUserIds = [...new Set(
        userIds.map((value) => String(value || "").trim()),
      )].filter(Boolean);

      const emptyMap = new Map();
      if (!normalizedUserIds.length) {
        return emptyMap;
      }

      const rolesByUser = await repository.getRolesForUsers(normalizedUserIds);
      const roleMap = new Map(
        rolesByUser.map((entry) => [entry.userId, entry]),
      );

      const ordered = normalizedUserIds.map((userId) => ({
        userId,
        roleId: roleMap.get(userId)?.roleId || null,
        roleName: roleMap.get(userId)?.roleName || null,
      }));

      const permissionsByUser = await getPermissionsForUsersByRoleIds(ordered);

      normalizedUserIds.forEach((userId) => {
        if (!permissionsByUser.has(userId)) {
          permissionsByUser.set(userId, []);
        }
      });

      return permissionsByUser;
    },

    async hasPermission(user, requiredPermission) {
      const roleInfo = await resolveRoleForUser(user);
      const permissions = await getPermissionsByRoleId(roleInfo.roleId);
      const allowed = permissions.some((granted) =>
        permissionMatches(granted, requiredPermission),
      );

      logger?.debug?.(
        {
          module: "rbac",
          userId: user?.id,
          roleId: roleInfo.roleId,
          requiredPermission,
          allowed,
        },
        "RBAC permission check",
      );

      return allowed;
    },

    async getRolePermissions(roleName) {
      if (!roleName) {
        throw new AppError(400, "Role is required", "RBAC_ROLE_REQUIRED");
      }

      return repository.getPermissionsByRole(roleName);
    },

    async getRolePermissionsById(roleId) {
      if (!roleId) {
        throw new AppError(400, "Role id is required", "RBAC_ROLE_ID_REQUIRED");
      }

      const role = await repository.findRoleById(roleId);
      if (!role) {
        throw new AppError(404, "Role not found", "RBAC_ROLE_NOT_FOUND");
      }

      return repository.getPermissionsByRoleId(roleId);
    },

    async setRolePermissions({ role, permissions }) {
      if (!role) {
        throw new AppError(400, "Role is required", "RBAC_ROLE_REQUIRED");
      }

      const normalizedPermissions = normalizePermissionKeys(permissions);
      const result = await repository.setRolePermissions(role, normalizedPermissions);

      invalidateRoleCache(result.roleId);
      events.emitRolePermissionsUpdated?.(result);

      return result;
    },

    async updateRolePermissionsById({
      roleId,
      permissions,
      permissionIds,
      replace = false,
    }) {
      if (!roleId) {
        throw new AppError(400, "Role id is required", "RBAC_ROLE_ID_REQUIRED");
      }

      const role = await repository.findRoleById(roleId);
      if (!role) {
        throw new AppError(404, "Role not found", "RBAC_ROLE_NOT_FOUND");
      }

      if (replace) {
        let resolvedPermissionIds =
          permissionIds && permissionIds.length ?
            [...new Set(permissionIds.map((id) => String(id || "").trim()))].filter(
              Boolean,
            )
          : [];

        if (!resolvedPermissionIds.length && Array.isArray(permissions)) {
          const idsFromPayload = permissions
            .filter(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                item.permissionId &&
                item.enabled !== false,
            )
            .map((item) => String(item.permissionId).trim());
          resolvedPermissionIds = [...new Set(idsFromPayload)];
        }

        if (!resolvedPermissionIds.length && Array.isArray(permissions)) {
          const keysFromPayload = permissions
            .filter((item) => {
              if (typeof item === "string") return true;
              if (typeof item === "object" && item !== null) {
                return item.key && item.enabled !== false;
              }
              return false;
            })
            .map((item) =>
              typeof item === "string" ? String(item).trim() : String(item.key).trim(),
            );

          if (keysFromPayload.length) {
            resolvedPermissionIds = await repository
              .resolvePermissionIdsByKeys(keysFromPayload, {
                createMissing: false,
              })
              .then((rows) => rows.map((row) => row.id));
          }
        }

        const nextPermissions = await repository.replaceRolePermissionsByRoleId(
          role.id,
          resolvedPermissionIds,
        );
        invalidateRoleCache(role.id);
        events.emitRolePermissionsUpdated?.({
          role: role.name,
          roleId: role.id,
          permissions: nextPermissions,
        });

        return {
          roleId: role.id,
          role: role.name,
          permissions: nextPermissions,
        };
      }

      if (!Array.isArray(permissions) || !permissions.length) {
        throw new AppError(
          400,
          "permissions array is required for patch mode",
          "RBAC_PERMISSIONS_REQUIRED",
        );
      }

      const assignments = [];
      for (const item of permissions) {
        if (typeof item === "string") {
          const permission = await repository.findPermissionByKey(item);
          if (!permission) {
            throw new AppError(
              404,
              `Permission not found: ${item}`,
              "RBAC_PERMISSION_NOT_FOUND",
            );
          }
          assignments.push({
            permissionId: permission.id,
            enabled: true,
          });
          continue;
        }

        let permissionId = item.permissionId;
        if (!permissionId && item.key) {
          const permission = await repository.findPermissionByKey(item.key);
          if (!permission) {
            throw new AppError(
              404,
              `Permission not found: ${item.key}`,
              "RBAC_PERMISSION_NOT_FOUND",
            );
          }
          permissionId = permission.id;
        }

        if (!permissionId) {
          throw new AppError(
            400,
            "permissionId or key is required in permissions patch payload",
            "RBAC_PERMISSION_ID_REQUIRED",
          );
        }

        assignments.push({
          permissionId,
          enabled: item.enabled !== false,
        });
      }

      const nextPermissions = await repository.setRolePermissionsByRoleId(
        role.id,
        assignments,
      );

      invalidateRoleCache(role.id);
      events.emitRolePermissionsUpdated?.({
        role: role.name,
        roleId: role.id,
        permissions: nextPermissions,
      });

      return {
        roleId: role.id,
        role: role.name,
        permissions: nextPermissions,
      };
    },
  });
}

export { createRbacService };
