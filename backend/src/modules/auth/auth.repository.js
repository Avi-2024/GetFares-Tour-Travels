function createAuthRepository({ db, logger, schema }) {
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
      isActive: row.is_active ?? row.isActive ?? true,
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
        if (error?.code !== '23505') {
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

    if (!roleName && roleId) {
      const roleRecord = await db.findById(schema.rolesTable, roleId);
      roleName = roleRecord?.name || null;
    }

    if (!roleId && roleName) {
      const roleRecord = await db.findOne(schema.rolesTable, { name: roleName });
      roleId = roleRecord?.id || null;
    }

    return toDomainUser(userRow, { roleName, roleId });
  }

  return Object.freeze({
    async createUser(payload) {
      logger.debug({ email: payload.email, role: payload.role }, 'Creating auth user');

      const roleRecord = await resolveRole(payload.role);

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
  });
}

module.exports = { createAuthRepository };
