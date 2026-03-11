const { AppError } = require('../../core/errors');

function createRbacMiddleware({ rbacService }) {
  function authorize(permission) {
    return async (req, res, next) => {
      if (!req.context?.user) {
        return next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
      }

      const allowed = await rbacService.hasPermission(req.context.user, permission);

      if (!allowed) {
        return next(new AppError(403, `Missing permission: ${permission}`, 'RBAC_FORBIDDEN'));
      }

      return next();
    };
  }

  return Object.freeze({ authorize });
}

module.exports = { createRbacMiddleware };
