import { AppError } from "../errors/index.js";

const ROLES_TABLE = "roles";

function createRolesService({ db, logger }) {
  const columnCache = new Map();

  async function hasColumn(columnName) {
    if (typeof db?.query !== "function") {
      return true;
    }

    if (columnCache.has(columnName)) {
      return columnCache.get(columnName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
        [ROLES_TABLE, columnName],
      );
      const exists = result.rowCount > 0;
      columnCache.set(columnName, exists);
      return exists;
    } catch (_error) {
      columnCache.set(columnName, false);
      return false;
    }
  }

  function toRole(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      country: row.country ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
    };
  }

  async function findRoleById(roleId) {
    if (!roleId) return null;
    const row = await db.findById(ROLES_TABLE, roleId);
    return toRole(row);
  }

  async function findRoleByName(roleName) {
    if (!roleName) return null;
    const row = await db.findOne(ROLES_TABLE, { name: roleName });
    return toRole(row);
  }

  async function createRole(payload = {}) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new AppError(400, "Role name is required", "ROLE_NAME_REQUIRED");
    }

    const existing = await findRoleByName(name);
    if (existing) {
      throw new AppError(409, "Role already exists", "ROLE_ALREADY_EXISTS");
    }

    const includeCountry = await hasColumn("country");
    const includeIsActive = await hasColumn("is_active");
    const record = {
      name,
      description: payload.description ?? null,
    };

    if (payload.country !== undefined) {
      if (includeCountry) {
        record.country = payload.country || null;
      } else {
        logger?.warn?.(
          { roleName: name },
          "roles.country column missing; skipping country during role create",
        );
      }
    }

    if (includeIsActive && payload.isActive !== undefined) {
      record.is_active = payload.isActive;
    }

    try {
      const created = await db.insert(ROLES_TABLE, record);
      return toRole(created);
    } catch (error) {
      if (error?.code === "23505") {
        throw new AppError(409, "Role already exists", "ROLE_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  async function updateRole(roleId, payload = {}) {
    if (!roleId) {
      throw new AppError(400, "Role id is required", "ROLE_ID_REQUIRED");
    }

    const existing = await findRoleById(roleId);
    if (!existing) {
      throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");
    }

    const updates = {};
    if (payload.name !== undefined) {
      const name = String(payload.name || "").trim();
      if (!name) {
        throw new AppError(400, "Role name is required", "ROLE_NAME_REQUIRED");
      }
      updates.name = name;
    }

    const includeCountry = await hasColumn("country");
    if (payload.description !== undefined) {
      updates.description = payload.description ?? null;
    }

    if (payload.country !== undefined) {
      if (includeCountry) {
        updates.country = payload.country || null;
      } else {
        logger?.warn?.(
          { roleId },
          "roles.country column missing; skipping country during role update",
        );
      }
    }

    const includeIsActive = await hasColumn("is_active");
    if (includeIsActive && payload.isActive !== undefined) {
      updates.is_active = payload.isActive;
    }

    if (!Object.keys(updates).length) {
      return existing;
    }

    try {
      const updated = await db.update(ROLES_TABLE, roleId, updates);
      return toRole(updated);
    } catch (error) {
      if (error?.code === "23505") {
        throw new AppError(409, "Role already exists", "ROLE_ALREADY_EXISTS");
      }
      throw error;
    }
  }

  async function ensureRole(payload = {}) {
    const name = String(payload.name || payload.role || "").trim();
    if (!name) {
      throw new AppError(400, "Role name is required", "ROLE_NAME_REQUIRED");
    }

    let role = await findRoleByName(name);
    if (role) {
      return role;
    }

    const description =
      payload.description !== undefined ? payload.description : `Auto-created role: ${name}`;
    const created = await createRole({
      name,
      description,
      isActive: payload.isActive ?? true,
    });
    return created;
  }

  async function resolveRole({ role, roleId, description, isActive } = {}) {
    if (roleId) {
      const existing = await findRoleById(roleId);
      if (!existing) {
        throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");
      }
      return existing;
    }

    if (role) {
      return ensureRole({ name: role, description, isActive });
    }

    return null;
  }

  return Object.freeze({
    findRoleById,
    findRoleByName,
    createRole,
    updateRole,
    ensureRole,
    resolveRole,
  });
}

export { createRolesService };
