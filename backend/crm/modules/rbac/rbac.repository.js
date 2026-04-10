function createRbacRepository({ db, logger, schema }) {
  const normalizePermissionKeys = (permissionKeys = []) =>
    [...new Set(permissionKeys.map((value) => String(value || "").trim()))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));

  let capabilitiesPromise = null;

  function quotedColumn(columnName) {
    return `\`${columnName}\``;
  }

  function getPermissionColumn(capabilities) {
    return capabilities.hasPermissionKey ? "key" : "name";
  }

  async function getCapabilities() {
    if (capabilitiesPromise) {
      return capabilitiesPromise;
    }

    if (db.adapter !== "mysql") {
      capabilitiesPromise = Promise.resolve({
        hasPermissionKey: false,
        hasPermissionName: true,
        hasPermissionDescription: false,
        hasPermissionIsActive: false,
        hasRoleIsActive: false,
        hasRoleCountry: false,
        hasRolePermissionIsActive: false,
      });
      return capabilitiesPromise;
    }

    const promise = db
      .query(
        `
              SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
              FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME IN (?, ?, ?)
            `,
        [schema.rolesTable, schema.permissionsTable, schema.rolePermissionsTable],
      )
      .then((result) => {
        const hasColumn = (tableName, columnName) =>
          (result.rows || []).some((row) => {
            const t = row.table_name ?? row.TABLE_NAME;
            const c = row.column_name ?? row.COLUMN_NAME;
            return t === tableName && c === columnName;
          });

        return {
          hasPermissionKey: hasColumn(schema.permissionsTable, "key"),
          hasPermissionName: hasColumn(schema.permissionsTable, "name"),
          hasPermissionDescription: hasColumn(
            schema.permissionsTable,
            "description",
          ),
          hasPermissionIsActive: hasColumn(
            schema.permissionsTable,
            "is_active",
          ),
          hasRoleIsActive: hasColumn(schema.rolesTable, "is_active"),
          hasRoleCountry: hasColumn(schema.rolesTable, "country"),
          hasRolePermissionIsActive: hasColumn(
            schema.rolePermissionsTable,
            "is_active",
          ),
        };
      })
      .catch((error) => {
        capabilitiesPromise = null;
        throw error;
      });

    capabilitiesPromise = promise;
    return capabilitiesPromise;
  }

  async function findRoleById(roleId) {
    if (!roleId) return null;

    if (db.adapter === "mysql") {
      const capabilities = await getCapabilities();
      const roleIsActiveSql =
        capabilities.hasRoleIsActive ? "r.is_active" : "1";
      const roleCountrySql =
        capabilities.hasRoleCountry ? "r.country" : "NULL";
      const result = await db.query(
        `
          SELECT
            r.id,
            r.name,
            r.description,
            ${roleCountrySql} AS country,
            ${roleIsActiveSql} AS is_active
          FROM ${schema.rolesTable} r
          WHERE r.id = ?
          LIMIT 1
        `,
        [roleId],
      );
      return result.rows?.[0] || null;
    }

    const row = await db.findById(schema.rolesTable, roleId);
    if (!row) {
      return null;
    }

    return {
      ...row,
      is_active: row.is_active ?? true,
    };
  }

  async function findRoleByName(roleName) {
    if (!roleName) return null;

    if (db.adapter === "mysql") {
      const capabilities = await getCapabilities();
      const roleIsActiveSql =
        capabilities.hasRoleIsActive ? "r.is_active" : "1";
      const roleCountrySql =
        capabilities.hasRoleCountry ? "r.country" : "NULL";
      const result = await db.query(
        `
          SELECT
            r.id,
            r.name,
            r.description,
            ${roleCountrySql} AS country,
            ${roleIsActiveSql} AS is_active
          FROM ${schema.rolesTable} r
          WHERE r.name = ?
          LIMIT 1
        `,
        [roleName],
      );
      return result.rows?.[0] || null;
    }

    const row = await db.findOne(schema.rolesTable, { name: roleName });
    if (!row) {
      return null;
    }

    return {
      ...row,
      is_active: row.is_active ?? true,
    };
  }

  async function ensureRole(roleName) {
    let role = await findRoleByName(roleName);
    if (role) {
      return role;
    }

    const description = `Auto-created role: ${roleName}`;
    if (db.adapter === "mysql") {
      const capabilities = await getCapabilities();
      const columns = ["name", "description"];
      const placeholders = ["?", "?"];
      const values = [roleName, description];

      if (capabilities.hasRoleIsActive) {
        columns.push("is_active");
        placeholders.push("?");
        values.push(1);
      }

      const roleIsActiveSql =
        capabilities.hasRoleIsActive ? "is_active" : "1";
      const roleCountrySql =
        capabilities.hasRoleCountry ? "country" : "NULL";

      await db.query(
        `
          INSERT INTO ${schema.rolesTable} (${columns.join(", ")})
          VALUES (${placeholders.join(", ")})
          ON DUPLICATE KEY UPDATE
            description = COALESCE(VALUES(description), ${schema.rolesTable}.description)
        `,
        values,
      );

      const selectResult = await db.query(
        `
          SELECT
            id,
            name,
            description,
            ${roleCountrySql} AS country,
            ${roleIsActiveSql} AS is_active
          FROM ${schema.rolesTable}
          WHERE name = ?
          LIMIT 1
        `,
        [roleName],
      );

      return selectResult.rows?.[0] || null;
    }

    return db.insert(schema.rolesTable, {
      name: roleName,
      description,
      is_active: true,
    });
  }

  async function listRoles({ includeInactive = true } = {}) {
    if (db.adapter === "mysql") {
      const capabilities = await getCapabilities();
      const roleIsActiveSql =
        capabilities.hasRoleIsActive ? "r.is_active" : "1";
      const roleCountrySql =
        capabilities.hasRoleCountry ? "r.country" : "NULL";

      const values = [];
      let whereClause = "";
      if (capabilities.hasRoleIsActive && !includeInactive) {
        values.push(1);
        whereClause = `WHERE r.is_active = ?`;
      }

      const result = await db.query(
        `
          SELECT
            r.id,
            r.name,
            r.description,
            ${roleCountrySql} AS country,
            ${roleIsActiveSql} AS is_active
          FROM ${schema.rolesTable} r
          ${whereClause}
          ORDER BY r.name ASC
        `,
        values,
      );

      return result.rows || [];
    }

    const rows = await db.findMany(schema.rolesTable, {});
    return rows
      .filter((row) => includeInactive || row.is_active !== false)
      .map((row) => ({
        ...row,
        is_active: row.is_active ?? true,
      }))
      .sort((left, right) =>
        String(left.name || "").localeCompare(String(right.name || "")),
      );
  }

  async function findPermissionById(permissionId) {
    if (!permissionId) return null;

    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter === "mysql") {
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const descriptionSql =
        capabilities.hasPermissionDescription ? "p.description" : "NULL";
      const isActiveSql =
        capabilities.hasPermissionIsActive ? "p.is_active" : "1";

      const result = await db.query(
        `
          SELECT
            p.id,
            ${keySql} AS permission_key,
            ${descriptionSql} AS description,
            ${isActiveSql} AS is_active
          FROM ${schema.permissionsTable} p
          WHERE p.id = ?
          LIMIT 1
        `,
        [permissionId],
      );

      const row = result.rows?.[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        key: row.permission_key,
        name: row.permission_key,
        description: row.description ?? null,
        is_active: row.is_active !== false,
      };
    }

    const row = await db.findById(schema.permissionsTable, permissionId);
    if (!row) {
      return null;
    }

    const key = row.key || row.name;
    return {
      ...row,
      key,
      name: key,
      description: row.description ?? null,
      is_active: row.is_active ?? true,
    };
  }

  async function findPermissionByKey(permissionKey) {
    if (!permissionKey) return null;

    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter === "mysql") {
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const descriptionSql =
        capabilities.hasPermissionDescription ? "p.description" : "NULL";
      const isActiveSql =
        capabilities.hasPermissionIsActive ? "p.is_active" : "1";

      const result = await db.query(
        `
          SELECT
            p.id,
            ${keySql} AS permission_key,
            ${descriptionSql} AS description,
            ${isActiveSql} AS is_active
          FROM ${schema.permissionsTable} p
          WHERE ${keySql} = ?
          LIMIT 1
        `,
        [permissionKey],
      );

      const row = result.rows?.[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        key: row.permission_key,
        name: row.permission_key,
        description: row.description ?? null,
        is_active: row.is_active !== false,
      };
    }

    const rows = await db.findMany(schema.permissionsTable, {});
    const row = rows.find((entry) => (entry.key || entry.name) === permissionKey);
    if (!row) {
      return null;
    }

    const key = row.key || row.name;
    return {
      ...row,
      key,
      name: key,
      description: row.description ?? null,
      is_active: row.is_active ?? true,
    };
  }

  async function listPermissions({ includeInactive = true } = {}) {
    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter === "mysql") {
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const descriptionSql =
        capabilities.hasPermissionDescription ? "p.description" : "NULL";
      const isActiveSql =
        capabilities.hasPermissionIsActive ? "p.is_active" : "1";

      const values = [];
      let whereClause = "";
      if (capabilities.hasPermissionIsActive && !includeInactive) {
        values.push(1);
        whereClause = `WHERE p.is_active = ?`;
      }

      const result = await db.query(
        `
          SELECT
            p.id,
            ${keySql} AS permission_key,
            ${descriptionSql} AS description,
            ${isActiveSql} AS is_active
          FROM ${schema.permissionsTable} p
          ${whereClause}
          ORDER BY permission_key ASC
        `,
        values,
      );

      return (result.rows || []).map((row) => ({
        id: row.id,
        key: row.permission_key,
        name: row.permission_key,
        description: row.description ?? null,
        is_active: row.is_active !== false,
      }));
    }

    const rows = await db.findMany(schema.permissionsTable, {});
    return rows
      .map((row) => {
        const key = row.key || row.name;
        return {
          ...row,
          key,
          name: key,
          description: row.description ?? null,
          is_active: row.is_active ?? true,
        };
      })
      .filter((row) => includeInactive || row.is_active !== false)
      .sort((left, right) =>
        String(left.key || "").localeCompare(String(right.key || "")),
      );
  }

  async function createPermission({ key, description = null, isActive = true }) {
    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter !== "mysql") {
      const created = await db.insert(schema.permissionsTable, {
        [keyColumn]: key,
        description,
        is_active: isActive,
      });
      return findPermissionById(created.id);
    }

    const columns = [quotedColumn(keyColumn)];
    const placeholders = ["?"];
    const values = [key];

    if (capabilities.hasPermissionName && keyColumn !== "name") {
      columns.push("name");
      placeholders.push("?");
      values.push(key);
    }

    if (capabilities.hasPermissionDescription) {
      columns.push("description");
      placeholders.push("?");
      values.push(description);
    }

    if (capabilities.hasPermissionIsActive) {
      columns.push("is_active");
      placeholders.push("?");
      values.push(isActive);
    }

    const updateParts = [];
    if (capabilities.hasPermissionDescription) {
      updateParts.push("description = VALUES(description)");
    }
    if (capabilities.hasPermissionIsActive) {
      updateParts.push("is_active = VALUES(is_active)");
    }
    if (capabilities.hasPermissionName && keyColumn !== "name") {
      updateParts.push("name = VALUES(name)");
    }

    const keySql = quotedColumn(keyColumn);
    const descriptionSql =
      capabilities.hasPermissionDescription ? "description" : "NULL";
    const isActiveSql =
      capabilities.hasPermissionIsActive ? "is_active" : "1";

    await db.query(
      `
        INSERT INTO ${schema.permissionsTable} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        ON DUPLICATE KEY UPDATE
          ${updateParts.length ? updateParts.join(", ") : `${quotedColumn(keyColumn)} = VALUES(${quotedColumn(keyColumn)})`}
      `,
      values,
    );

    const selectResult = await db.query(
      `
        SELECT
          id,
          ${keySql} AS permission_key,
          ${descriptionSql} AS description,
          ${isActiveSql} AS is_active
        FROM ${schema.permissionsTable}
        WHERE ${keySql} = ?
        LIMIT 1
      `,
      [key],
    );

    const row = selectResult.rows?.[0];
    return row ?
        {
          id: row.id,
          key: row.permission_key,
          name: row.permission_key,
          description: row.description ?? null,
          is_active: row.is_active !== false,
        }
      : null;
  }

  async function updatePermission(
    permissionId,
    { key, description, isActive } = {},
  ) {
    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter !== "mysql") {
      const payload = {};
      if (key !== undefined) payload[keyColumn] = key;
      if (description !== undefined) payload.description = description;
      if (isActive !== undefined) payload.is_active = isActive;
      if (!Object.keys(payload).length) {
        return findPermissionById(permissionId);
      }
      await db.update(schema.permissionsTable, permissionId, payload);
      return findPermissionById(permissionId);
    }

    const updates = [];
    const values = [];

    if (key !== undefined) {
      values.push(key);
      updates.push(`${quotedColumn(keyColumn)} = ?`);
      if (capabilities.hasPermissionName && keyColumn !== "name") {
        updates.push(`name = ?`);
        values.push(key);
      }
    }

    if (description !== undefined && capabilities.hasPermissionDescription) {
      values.push(description);
      updates.push(`description = ?`);
    }

    if (isActive !== undefined && capabilities.hasPermissionIsActive) {
      values.push(isActive);
      updates.push(`is_active = ?`);
    }

    if (!updates.length) {
      return findPermissionById(permissionId);
    }

    values.push(permissionId);
    await db.query(
      `
        UPDATE ${schema.permissionsTable}
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
      values,
    );

    return findPermissionById(permissionId);
  }

  async function getRoleForUser(userId) {
    if (!userId) return null;

    if (db.adapter === "mysql") {
      const result = await db.query(
        `
          SELECT
            u.id AS user_id,
            u.role_id AS role_id,
            r.name AS role_name
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.rolesTable} r ON r.id = u.role_id
          WHERE u.id = ?
          LIMIT 1
        `,
        [userId],
      );

      const row = result.rows?.[0];
      if (!row) {
        return null;
      }

      return {
        userId: row.user_id,
        roleId: row.role_id || null,
        roleName: row.role_name || null,
      };
    }

    const user = await db.findById(schema.usersTable, userId);
    if (!user) {
      return null;
    }

    const roleId = user.role_id || null;
    const role = roleId ? await db.findById(schema.rolesTable, roleId) : null;
    return {
      userId,
      roleId,
      roleName: role?.name || null,
    };
  }

  async function getRolesForUsers(userIds = []) {
    const normalized = [...new Set(userIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);

    if (!normalized.length) {
      return [];
    }

    if (db.adapter === "mysql") {
      const placeholders = normalized.map(() => "?").join(", ");
      const result = await db.query(
        `
          SELECT
            u.id AS user_id,
            u.role_id AS role_id,
            r.name AS role_name
          FROM ${schema.usersTable} u
          LEFT JOIN ${schema.rolesTable} r ON r.id = u.role_id
          WHERE u.id IN (${placeholders})
        `,
        normalized,
      );

      return (result.rows || []).map((row) => ({
        userId: row.user_id,
        roleId: row.role_id || null,
        roleName: row.role_name || null,
      }));
    }

    const users = await Promise.all(
      normalized.map((userId) => db.findById(schema.usersTable, userId)),
    );

    const roles = await Promise.all(
      users.map((user) =>
        user?.role_id ? db.findById(schema.rolesTable, user.role_id) : null,
      ),
    );

    return users
      .map((user, index) => {
        if (!user) return null;
        return {
          userId: user.id,
          roleId: user.role_id || null,
          roleName: roles[index]?.name || null,
        };
      })
      .filter(Boolean);
  }

  async function getPermissionsByRoleId(roleId) {
    if (!roleId) return [];

    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter === "mysql") {
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const filters = ["rp.role_id = ?"];
      if (capabilities.hasRolePermissionIsActive) {
        filters.push("rp.is_active = 1");
      }
      if (capabilities.hasPermissionIsActive) {
        filters.push("p.is_active = 1");
      }

      const result = await db.query(
        `
          SELECT DISTINCT ${keySql} AS permission_key
          FROM ${schema.rolePermissionsTable} rp
          INNER JOIN ${schema.permissionsTable} p ON p.id = rp.permission_id
          WHERE ${filters.join(" AND ")}
          ORDER BY permission_key ASC
        `,
        [roleId],
      );

      return normalizePermissionKeys(
        (result.rows || []).map((row) => row.permission_key),
      );
    }

    const links = await db.findMany(schema.rolePermissionsTable, {
      role_id: roleId,
    });
    const permissions = await Promise.all(
      links.map((link) => db.findById(schema.permissionsTable, link.permission_id)),
    );

    return normalizePermissionKeys(
      permissions.map((permission) => permission?.key || permission?.name),
    );
  }

  async function getPermissionsByRoleIds(roleIds = []) {
    const normalizedRoleIds = [...new Set(roleIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);
    const permissionsByRoleId = new Map(
      normalizedRoleIds.map((roleId) => [roleId, []]),
    );

    if (!normalizedRoleIds.length) {
      return permissionsByRoleId;
    }

    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter === "mysql") {
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const rolePlaceholders = normalizedRoleIds.map(() => "?").join(", ");
      const filters = [`rp.role_id IN (${rolePlaceholders})`];
      if (capabilities.hasRolePermissionIsActive) {
        filters.push("rp.is_active = 1");
      }
      if (capabilities.hasPermissionIsActive) {
        filters.push("p.is_active = 1");
      }

      const result = await db.query(
        `
          SELECT
            rp.role_id,
            ${keySql} AS permission_key
          FROM ${schema.rolePermissionsTable} rp
          INNER JOIN ${schema.permissionsTable} p ON p.id = rp.permission_id
          WHERE ${filters.join(" AND ")}
          ORDER BY rp.role_id ASC, permission_key ASC
        `,
        [...normalizedRoleIds],
      );

      (result.rows || []).forEach((row) => {
        const roleId = String(row.role_id);
        const existing = permissionsByRoleId.get(roleId) || [];
        existing.push(row.permission_key);
        permissionsByRoleId.set(roleId, existing);
      });

      permissionsByRoleId.forEach((values, roleId) => {
        permissionsByRoleId.set(roleId, normalizePermissionKeys(values));
      });

      return permissionsByRoleId;
    }

    await Promise.all(
      normalizedRoleIds.map(async (roleId) => {
        const permissions = await getPermissionsByRoleId(roleId);
        permissionsByRoleId.set(roleId, permissions);
      }),
    );

    return permissionsByRoleId;
  }

  async function getPermissionsByRole(roleName) {
    const role = await findRoleByName(roleName);
    if (!role?.id) {
      return [];
    }
    return getPermissionsByRoleId(role.id);
  }

  async function getPermissionsByRoles(roleNames = []) {
    const normalizedRoles = [...new Set(roleNames.map((value) => String(value || "").trim()))]
      .filter(Boolean);

    if (!normalizedRoles.length) {
      return [];
    }

    if (db.adapter === "mysql") {
      const capabilities = await getCapabilities();
      const keyColumn = getPermissionColumn(capabilities);
      const keySql = `p.${quotedColumn(keyColumn)}`;
      const namePlaceholders = normalizedRoles.map(() => "?").join(", ");
      const filters = [`r.name IN (${namePlaceholders})`];

      if (capabilities.hasRolePermissionIsActive) {
        filters.push("rp.is_active = 1");
      }
      if (capabilities.hasPermissionIsActive) {
        filters.push("p.is_active = 1");
      }

      const result = await db.query(
        `
          SELECT DISTINCT ${keySql} AS permission_key
          FROM ${schema.rolePermissionsTable} rp
          INNER JOIN ${schema.rolesTable} r ON r.id = rp.role_id
          INNER JOIN ${schema.permissionsTable} p ON p.id = rp.permission_id
          WHERE ${filters.join(" AND ")}
          ORDER BY permission_key ASC
        `,
        [...normalizedRoles],
      );

      return normalizePermissionKeys(
        (result.rows || []).map((row) => row.permission_key),
      );
    }

    const grouped = await Promise.all(
      normalizedRoles.map((roleName) => getPermissionsByRole(roleName)),
    );
    return normalizePermissionKeys(grouped.flat());
  }

  async function assignRoleById(userId, roleId) {
    const user = await db.findById(schema.usersTable, userId);
    if (!user) {
      return null;
    }

    const role = await findRoleById(roleId);
    if (!role) {
      return null;
    }

    logger.debug({ userId, roleId }, "Assigning role to user");
    const updated = await db.update(schema.usersTable, userId, {
      role_id: roleId,
    });

    return {
      userId,
      roleId,
      role: role.name,
      assignedAt:
        updated?.updated_at || updated?.updatedAt || new Date().toISOString(),
    };
  }

  async function assignRole(userId, roleName) {
    const role = await ensureRole(roleName);
    if (!role?.id) {
      return null;
    }
    return assignRoleById(userId, role.id);
  }

  async function countActiveUsersByRoleId(roleId, { excludeUserId = null } = {}) {
    if (!roleId) return 0;

    if (db.adapter === "mysql") {
      const values = [roleId];
      const filters = ["u.role_id = ?", "u.is_active = 1"];
      if (excludeUserId) {
        values.push(excludeUserId);
        filters.push(`u.id <> ?`);
      }
      const result = await db.query(
        `
          SELECT COUNT(*) AS count
          FROM ${schema.usersTable} u
          WHERE ${filters.join(" AND ")}
        `,
        values,
      );
      return Number(result.rows[0]?.count || 0);
    }

    const rows = await db.findMany(schema.usersTable, {
      role_id: roleId,
      is_active: true,
    });
    return rows.filter((row) => row.id !== excludeUserId).length;
  }

  async function resolvePermissionIdsByKeys(
    permissionKeys = [],
    { createMissing = false } = {},
  ) {
    const normalizedKeys = normalizePermissionKeys(permissionKeys);
    if (!normalizedKeys.length) {
      return [];
    }

    const capabilities = await getCapabilities();
    const keyColumn = getPermissionColumn(capabilities);

    if (db.adapter !== "mysql") {
      const rows = await db.findMany(schema.permissionsTable, {});
      const records = rows
        .filter((row) => normalizedKeys.includes(row[keyColumn] || row.name))
        .map((row) => ({
          id: row.id,
          key: row[keyColumn] || row.name,
        }));

      if (createMissing) {
        const existingSet = new Set(records.map((entry) => entry.key));
        for (const key of normalizedKeys) {
          if (!existingSet.has(key)) {
            const created = await createPermission({ key });
            records.push({
              id: created.id,
              key,
            });
          }
        }
      }

      return records;
    }

    const keySql = quotedColumn(keyColumn);
    const keyPlaceholders = normalizedKeys.map(() => "?").join(", ");
    const existingResult = await db.query(
      `
        SELECT id, ${keySql} AS permission_key
        FROM ${schema.permissionsTable}
        WHERE ${keySql} IN (${keyPlaceholders})
      `,
      [...normalizedKeys],
    );

    const records = (existingResult.rows || []).map((row) => ({
      id: row.id,
      key: row.permission_key,
    }));

    if (createMissing) {
      const existingSet = new Set(records.map((entry) => entry.key));
      for (const key of normalizedKeys) {
        if (existingSet.has(key)) {
          continue;
        }
        const created = await createPermission({ key });
        if (created?.id) {
          records.push({ id: created.id, key: created.key });
          existingSet.add(key);
        }
      }
    }

    return records;
  }

  async function setRolePermissionsByRoleId(roleId, assignments = []) {
    if (db.adapter !== "mysql") {
      throw new Error("Role permission updates require MySQL adapter.");
    }

    if (!assignments.length) {
      return getPermissionsByRoleId(roleId);
    }

    const capabilities = await getCapabilities();

    for (const assignment of assignments) {
      const enabled = assignment.enabled !== false;
      if (capabilities.hasRolePermissionIsActive) {
        await db.query(
          `
            INSERT INTO ${schema.rolePermissionsTable} (role_id, permission_id, is_active)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
          `,
          [roleId, assignment.permissionId, enabled ? 1 : 0],
        );
      } else if (enabled) {
        await db.query(
          `
            INSERT IGNORE INTO ${schema.rolePermissionsTable} (role_id, permission_id)
            VALUES (?, ?)
          `,
          [roleId, assignment.permissionId],
        );
      } else {
        await db.query(
          `
            DELETE FROM ${schema.rolePermissionsTable}
            WHERE role_id = ? AND permission_id = ?
          `,
          [roleId, assignment.permissionId],
        );
      }
    }

    return getPermissionsByRoleId(roleId);
  }

  async function replaceRolePermissionsByRoleId(roleId, permissionIds = []) {
    if (db.adapter !== "mysql") {
      throw new Error("Role permission updates require MySQL adapter.");
    }

    const capabilities = await getCapabilities();
    const normalizedPermissionIds = [...new Set(permissionIds)].filter(Boolean);

    if (capabilities.hasRolePermissionIsActive) {
      await db.query(
        `
          UPDATE ${schema.rolePermissionsTable}
          SET is_active = 0
          WHERE role_id = ?
        `,
        [roleId],
      );
    } else {
      await db.query(
        `
          DELETE FROM ${schema.rolePermissionsTable}
          WHERE role_id = ?
        `,
        [roleId],
      );
    }

    for (const permissionId of normalizedPermissionIds) {
      if (capabilities.hasRolePermissionIsActive) {
        await db.query(
          `
            INSERT INTO ${schema.rolePermissionsTable} (role_id, permission_id, is_active)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE is_active = 1
          `,
          [roleId, permissionId],
        );
      } else {
        await db.query(
          `
            INSERT IGNORE INTO ${schema.rolePermissionsTable} (role_id, permission_id)
            VALUES (?, ?)
          `,
          [roleId, permissionId],
        );
      }
    }

    return getPermissionsByRoleId(roleId);
  }

  async function setRolePermissions(roleName, permissionKeys = []) {
    if (db.adapter !== "mysql") {
      throw new Error("Role permission updates require MySQL adapter.");
    }

    const role = await ensureRole(roleName);
    const permissionRecords = await resolvePermissionIdsByKeys(permissionKeys, {
      createMissing: true,
    });
    const permissionIds = permissionRecords.map((entry) => entry.id);

    const permissions = await replaceRolePermissionsByRoleId(role.id, permissionIds);
    return {
      role: role.name,
      roleId: role.id,
      permissions,
    };
  }

  return Object.freeze({
    getCapabilities,
    ensureRole,
    findRoleById,
    findRoleByName,
    listRoles,
    findPermissionById,
    findPermissionByKey,
    listPermissions,
    createPermission,
    updatePermission,
    getRoleForUser,
    getRolesForUsers,
    getPermissionsByRoleId,
    getPermissionsByRoleIds,
    getPermissionsByRole,
    getPermissionsByRoles,
    assignRoleById,
    assignRole,
    countActiveUsersByRoleId,
    resolvePermissionIdsByKeys,
    setRolePermissionsByRoleId,
    replaceRolePermissionsByRoleId,
    setRolePermissions,
  });
}

export { createRbacRepository };
