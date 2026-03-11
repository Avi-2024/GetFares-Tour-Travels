const { AppError } = require('../../core/errors');
const { ROLE_PERMISSIONS, DEFAULT_ROLE } = require('../../core/constants');

function createRbacService({ repository, events }) {
  async function getRolesForUser(user) {
    const assigned = await repository.getRolesByUserId(user.id);
    if (!assigned.length) {
      return [user.role || DEFAULT_ROLE];
    }

    return [...new Set(assigned.map((entry) => entry.role))];
  }

  async function getPermissionsForUser(user) {
    const roles = await getRolesForUser(user);

    const permissions = new Set();
    roles.forEach((role) => {
      (ROLE_PERMISSIONS[role] || []).forEach((permission) => permissions.add(permission));
    });

    return {
      roles,
      permissions: [...permissions],
    };
  }

  return Object.freeze({
    getRolesForUser,
    getPermissionsForUser,

    async assignRole({ userId, role }) {
      if (!ROLE_PERMISSIONS[role]) {
        throw new AppError(400, `Unknown role: ${role}`, 'RBAC_UNKNOWN_ROLE');
      }

      const assignment = await repository.assignRole(userId, role);
      if (!assignment) {
        throw new AppError(404, 'User not found', 'RBAC_USER_NOT_FOUND');
      }
      events.emitRoleAssigned(assignment);
      return assignment;
    },

    async hasPermission(user, requiredPermission) {
      const { permissions } = await getPermissionsForUser(user);

      return permissions.some((granted) => {
        if (granted === '*') {
          return true;
        }
        if (granted === requiredPermission) {
          return true;
        }
        if (granted.endsWith(':*')) {
          const [scope] = granted.split(':');
          return requiredPermission.startsWith(`${scope}:`);
        }
        return false;
      });
    },
  });
}

module.exports = { createRbacService };
