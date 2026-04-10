import { AppError } from "../errors/index.js";

const ROLES_TABLE = "roles";
const COUNTRIES_TABLE = "countries";

function createRolesService({ db, logger }) {
  const columnCache = new Map();
  const tableCache = new Map();

  async function hasColumn(columnName) {
    if (typeof db?.query !== "function") {
      return true;
    }

    if (columnCache.has(columnName)) {
      return columnCache.get(columnName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
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

  async function hasTable(tableName) {
    if (typeof db?.query !== "function") {
      return true;
    }

    if (tableCache.has(tableName)) {
      return tableCache.get(tableName);
    }

    try {
      const result = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
        [tableName],
      );
      const exists = result.rowCount > 0;
      tableCache.set(tableName, exists);
      return exists;
    } catch (_error) {
      tableCache.set(tableName, false);
      return false;
    }
  }

  const normalizeCountryText = (value) => {
    if (value === undefined) return undefined;
    const normalized = String(value ?? "").trim();
    return normalized || null;
  };

  const normalizeCountryKey = (value) =>
    value === null || value === undefined ? null : String(value).trim().toLowerCase();

  async function resolveCountryName(countryValue) {
    const normalized = normalizeCountryText(countryValue);
    if (normalized === undefined || normalized === null) {
      return normalized;
    }

    if (typeof db?.query !== "function") {
      return normalized;
    }

    const countriesTableExists = await hasTable(COUNTRIES_TABLE);
    if (!countriesTableExists) {
      return normalized;
    }

    try {
      const result = await db.query(
        `
          SELECT id, code, name, is_active
          FROM ${COUNTRIES_TABLE}
          WHERE LOWER(code) = LOWER(?)
             OR LOWER(name) = LOWER(?)
          LIMIT 1
        `,
        [normalized, normalized],
      );

      const country = result.rows?.[0];
      if (!country) {
        throw new AppError(
          400,
          "Invalid country. Please select a valid active country.",
          "ROLE_COUNTRY_INVALID",
        );
      }

      if (country.is_active === false) {
        throw new AppError(
          409,
          "Selected country is inactive. Activate it first.",
          "ROLE_COUNTRY_INACTIVE",
        );
      }

      return country.name;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger?.warn?.(
        { countryValue: normalized, err: error },
        "Country validation failed during role create/update; using raw country text",
      );
      return normalized;
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

    const resolvedCountry = await resolveCountryName(payload.country);

    const existing = await findRoleByName(name);
    if (existing) {
      const existingCountry = normalizeCountryText(existing.country);
      const requestedCountry =
        resolvedCountry === undefined ? existingCountry : resolvedCountry;
      const mismatch =
        resolvedCountry !== undefined &&
        normalizeCountryKey(existingCountry) !== normalizeCountryKey(resolvedCountry);
      throw new AppError(
        409,
        mismatch
          ? `Role already exists for ${existingCountry || "All countries"}. Select existing role from list or choose a different role name.`
          : "Role already exists",
        "ROLE_ALREADY_EXISTS",
        {
          existingRoleId: existing.id,
          existingRoleName: existing.name,
          existingCountry,
          requestedCountry,
        },
      );
    }

    const includeCountry = await hasColumn("country");
    const includeIsActive = await hasColumn("is_active");
    const record = {
      name,
      description: payload.description ?? null,
    };

    if (payload.country !== undefined) {
      if (includeCountry) {
        record.country = resolvedCountry ?? null;
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
      if (error?.code === "23505" || error?.errno === 1062) {
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
    const resolvedCountry = await resolveCountryName(payload.country);
    if (payload.description !== undefined) {
      updates.description = payload.description ?? null;
    }

    if (payload.country !== undefined) {
      if (includeCountry) {
        updates.country = resolvedCountry ?? null;
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
      if (error?.code === "23505" || error?.errno === 1062) {
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
