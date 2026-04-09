function createAuthRepository({ db, logger, schema }) {
  const columnCache = new Map();

  async function hasUsersColumn(columnName) {
    if (typeof db?.query !== "function") {
      return true;
    }

    const cacheKey = `${schema.usersTable}:${columnName}`;
    if (columnCache.get(cacheKey) === true) {
      return true;
    }

    try {
      const result = await db.query(
        `SELECT 1
           FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = ?
            AND column_name = ?
          LIMIT 1`,
        [schema.usersTable, columnName],
      );
      const exists = result.rowCount > 0;
      if (exists) {
        columnCache.set(cacheKey, true);
      } else {
        columnCache.delete(cacheKey);
      }
      return exists;
    } catch (_error) {
      columnCache.delete(cacheKey);
      return false;
    }
  }

  function toDomainUser(row, roleMeta = {}) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName,
      email: row.email,
      phone: row.phone ?? null,
      passwordHash: row.password_hash ?? row.passwordHash,
      role: roleMeta.roleName || row.role || null,
      roleId: roleMeta.roleId || row.role_id || row.roleId || null,
      roleCountry: roleMeta.roleCountry ?? null,
      agentCountry: row.agent_country ?? row.agentCountry ?? null,
      agentType: row.agent_type ?? row.agentType ?? null,
      isActive: row.is_active ?? row.isActive ?? true,
      active: row.active ?? null,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  async function resolveRole(roleName) {
    let roleRecord = await db.findOne(schema.rolesTable, { name: roleName });
    if (!roleRecord) {
      try {
        roleRecord = await db.insert(schema.rolesTable, {
          name: roleName,
          description: `Auto-created role: ${roleName}`,
        });
      } catch (error) {
        if (error?.code !== "23505") {
          throw error;
        }
        roleRecord = await db.findOne(schema.rolesTable, { name: roleName });
      }
    }

    return roleRecord;
  }

  async function attachRole(userRow) {
    if (!userRow) {
      return null;
    }

    let roleId = userRow.role_id || userRow.roleId || null;
    let roleName = userRow.role || null;
    let roleCountry = null;

    if (!roleName && roleId) {
      const roleRecord = await db.findById(schema.rolesTable, roleId);
      roleName = roleRecord?.name || null;
      roleCountry = roleRecord?.country ?? null;
    }

    if (!roleId && roleName) {
      const roleRecord = await db.findOne(schema.rolesTable, {
        name: roleName,
      });
      roleId = roleRecord?.id || null;
      roleCountry = roleRecord?.country ?? null;
    }

    return toDomainUser(userRow, { roleName, roleId, roleCountry });
  }

  return Object.freeze({
    async createUser(payload) {
      logger.debug(
        { email: payload.email, role: payload.role },
        "Creating auth user",
      );

      const roleRecord =
        payload.roleId ?
          { id: payload.roleId, name: payload.role || null }
        : await resolveRole(payload.role);

      const created = await db.insert(schema.usersTable, {
        role_id: roleRecord.id,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        password_hash: payload.passwordHash,
        is_active: payload.isActive ?? true,
      });

      return toDomainUser(created, {
        roleName: roleRecord.name,
        roleId: roleRecord.id,
      });
    },

    async findUserByEmail(email) {
      const row = await db.findOne(schema.usersTable, { email });
      return attachRole(row);
    },

    async findUserById(id) {
      const row = await db.findById(schema.usersTable, id);
      return attachRole(row);
    },

    async saveSession(payload) {
      return db.insert(schema.sessionsTable, {
        user_id: payload.userId,
        ip_address: payload.ipAddress || null,
        device_info: payload.deviceInfo || null,
        login_time: payload.loginTime || new Date().toISOString(),
      });
    },

    async markLogin(userId) {
      if (!userId) {
        return null;
      }
      const payload = {
        last_login: new Date().toISOString(),
      };
      if (await hasUsersColumn("active")) {
        payload.active = true;
      }
      return db.update(schema.usersTable, userId, payload);
    },

    async setActiveStatus(userId, active) {
      if (!userId) {
        return null;
      }
      const payload = {
        updated_at: new Date().toISOString(),
      };
      if (await hasUsersColumn("active")) {
        payload.active = Boolean(active);
      } else {
        logger?.warn?.(
          { userId, active },
          "users.active column missing; skipping presence status update",
        );
      }
      const row = await db.update(schema.usersTable, userId, payload);
      return attachRole(row);
    },

    async clearLoginPresence(userId) {
      if (!userId) {
        return null;
      }
      const payload = {
        updated_at: new Date().toISOString(),
      };
      if (await hasUsersColumn("active")) {
        payload.active = false;
      }
      return db.update(schema.usersTable, userId, payload);
    },
  });
}

export { createAuthRepository };
