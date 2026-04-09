function createUsersRepository({ db, logger, schema }) {
  async function hasColumn(tableName, columnName) {
    if (db.adapter !== "mysql") {
      return false;
    }
    try {
      const result = await db.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = ?
            AND column_name = ?
          LIMIT 1
        `,
        [tableName, columnName],
      );
      return result.rowCount > 0;
    } catch (error) {
      if (error?.code === "42P01") {
        return false;
      }
      throw error;
    }
  }

  async function findAll(filters = {}) {
    return db.findMany(schema.tableName, filters);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: "users", payload }, "Creating record");
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: "users", id, payload }, "Updating record");
    return db.update(schema.tableName, id, payload);
  }

  async function findRoleById(roleId) {
    if (!roleId) return null;
    return db.findById(schema.rolesTable, roleId);
  }

  async function countActiveUsersByRoleId(roleId, { excludeUserId } = {}) {
    if (!roleId) return 0;

    if (db.adapter === "mysql") {
      const values = [roleId];
      const filters = ["u.role_id = ?", "u.is_active = TRUE"];
      if (excludeUserId) {
        values.push(excludeUserId);
        filters.push(`u.id <> ?`);
      }

      const result = await db.query(
        `
          SELECT COUNT(*) AS count
          FROM ${schema.tableName} u
          WHERE ${filters.join(" AND ")}
        `,
        values,
      );
      return Number(result.rows[0]?.count || 0);
    }

    const all = await db.findMany(schema.tableName, {
      role_id: roleId,
      is_active: true,
    });
    return all.filter((row) => row.id !== excludeUserId).length;
  }

  async function findCountriesByIds(countryIds = []) {
    const normalized = [...new Set(countryIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);
    if (!normalized.length) return [];

    if (db.adapter === "mysql") {
      try {
        const placeholders = normalized.map(() => '?').join(',');
        const result = await db.query(
          `
            SELECT id, code, name, is_active
            FROM ${schema.countriesTable}
            WHERE id IN (${placeholders})
            ORDER BY name ASC
          `,
          normalized,
        );
        return result.rows;
      } catch (error) {
        if (error?.code === "42P01") {
          return [];
        }
        throw error;
      }
    }

    const rows = await Promise.all(
      normalized.map((id) => db.findById(schema.countriesTable, id)),
    );
    return rows.filter(Boolean);
  }

  async function listUserCountriesByUserIds(userIds = []) {
    const normalized = [...new Set(userIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);
    if (!normalized.length) {
      return new Map();
    }

    if (db.adapter === "mysql") {
      let result;
      try {
        const placeholders = normalized.map(() => '?').join(',');
        result = await db.query(
          `
            SELECT
              uc.user_id,
              uc.country_id,
              uc.is_primary,
              c.code,
              c.name,
              c.is_active
            FROM ${schema.userCountriesTable} uc
            INNER JOIN ${schema.countriesTable} c ON c.id = uc.country_id
            WHERE uc.user_id IN (${placeholders})
            ORDER BY uc.user_id ASC, uc.is_primary DESC, c.name ASC
          `,
          normalized,
        );
      } catch (error) {
        if (error?.code === "42P01") {
          return new Map();
        }
        throw error;
      }

      const map = new Map();
      result.rows.forEach((row) => {
        const userId = row.user_id;
        const existing = map.get(userId) || [];
        existing.push({
          countryId: row.country_id,
          code: row.code,
          name: row.name,
          isActive: row.is_active !== false,
          isPrimary: row.is_primary === true,
        });
        map.set(userId, existing);
      });
      return map;
    }

    return new Map();
  }

  async function replaceUserCountries({
    userId,
    countryIds = [],
    primaryCountryId = null,
    createdBy = null,
  }) {
    if (!userId) {
      return [];
    }

    const normalized = [...new Set(countryIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);

    if (db.adapter !== "mysql") {
      return [];
    }

    try {
      await db.query(
        `DELETE FROM ${schema.userCountriesTable} WHERE user_id = ?`,
        [userId],
      );
    } catch (error) {
      if (error?.code === "42P01") {
        return [];
      }
      throw error;
    }

    try {
      for (const countryId of normalized) {
        const isPrimary = primaryCountryId
          ? String(primaryCountryId) === String(countryId)
          : normalized[0] === countryId;
        await db.query(
          `
            INSERT INTO ${schema.userCountriesTable}
              (user_id, country_id, is_primary, created_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (user_id, country_id)
            DO UPDATE SET is_primary = EXCLUDED.is_primary
          `,
          [userId, countryId, isPrimary, createdBy],
        );
      }
    } catch (error) {
      if (error?.code === "42P01") {
        return [];
      }
      throw error;
    }

    const map = await listUserCountriesByUserIds([userId]);
    return map.get(userId) || [];
  }

  return Object.freeze({
    hasColumn,
    findAll,
    findById,
    create,
    update,
    findRoles: () => db.findMany(schema.rolesTable, {}),
    findRoleById,
    countActiveUsersByRoleId,
    findCountriesByIds,
    listUserCountriesByUserIds,
    replaceUserCountries,
  });
}

export { createUsersRepository };

