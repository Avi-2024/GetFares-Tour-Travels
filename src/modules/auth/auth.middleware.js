const { AppError } = require('../../core/errors');

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function createAuthMiddleware({ authService }) {
  function optionalAuth(req, res, next) {
    try {
      const token = extractToken(req);
      if (!token) {
        return next();
      }

      const payload = authService.verifyToken(token);
      req.context.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId || null,
      };

      return next();
    } catch (error) {
      return next();
    }
  }

  function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
      return next(new AppError(401, 'Access token is required', 'AUTH_TOKEN_REQUIRED'));
    }

    try {
      const payload = authService.verifyToken(token);
      req.context.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId || null,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  return Object.freeze({
    optionalAuth,
    requireAuth,
  });
}

module.exports = { createAuthMiddleware };
