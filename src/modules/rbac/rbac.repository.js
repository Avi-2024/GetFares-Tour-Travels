function createRbacRepository({ db, logger, schema }) {
  return Object.freeze({
    async assignRole(userId, role) {
      const user = await db.findById(schema.usersTable, userId);
      if (!user) {
        return null;
      }

      let roleRecord = await db.findOne(schema.rolesTable, { name: role });
      if (!roleRecord) {
        try {
          roleRecord = await db.insert(schema.rolesTable, { name: role });
        } catch (error) {
          if (error?.code !== '23505') {
            throw error;
          }
          roleRecord = await db.findOne(schema.rolesTable, { name: role });
        }
      }

      logger.debug({ userId, role }, 'Assigning role to user');
      const updated = await db.update(schema.usersTable, userId, {
        role_id: roleRecord.id,
      });

      return {
        userId,
        role,
        roleId: roleRecord.id,
        assignedAt: updated?.updated_at || updated?.updatedAt || new Date().toISOString(),
      };
    },

    async getRolesByUserId(userId) {
      const user = await db.findById(schema.usersTable, userId);
      if (!user) {
        return [];
      }

      const roleId = user.role_id || user.roleId || null;
      if (roleId) {
        const role = await db.findById(schema.rolesTable, roleId);
        if (role?.name) {
          return [{ role: role.name }];
        }
      }

      if (user.role) {
        return [{ role: user.role }];
      }

      return [];
    },
  });
}

module.exports = { createRbacRepository };
