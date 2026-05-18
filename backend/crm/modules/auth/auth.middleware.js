import { AppError } from "../../core/errors/index.js";

function extractToken(req, cookieName = "crm_access_token") {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token) {
      return token;
    }
  }

  const rawCookieHeader = req.headers.cookie;
  if (!rawCookieHeader) {
    return null;
  }
  const cookieHeader = String(rawCookieHeader);
  const segments = cookieHeader.split(";").map((part) => part.trim());
  for (const segment of segments) {
    if (!segment) continue;
    const [name, ...valueParts] = segment.split("=");
    if (name !== cookieName) continue;
    const value = valueParts.join("=").trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

function createAuthMiddleware({ authService, logger, authConfig }) {
  const cookieName = String(authConfig?.cookieName || "crm_access_token");
  function logAuthWarning(req, message, metadata = {}) {
    logger?.warn(
      {
        module: "auth",
        fileName: "auth.middleware.js",
        functionName: "requireAuth",
        requestId: req.context?.requestId,
        userId: req.context?.user?.id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: 401,
        metadata,
      },
      message,
    );
  }

  function optionalAuth(req, res, next) {
    try {
      const token = extractToken(req, cookieName);
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

  async function requireAuth(req, res, next) {
    const token = extractToken(req, cookieName);
    if (!token) {
      logAuthWarning(req, "Authentication failure", { reason: "AUTH_TOKEN_REQUIRED" });
      return next(
        new AppError(401, "Access token is required", "AUTH_TOKEN_REQUIRED"),
      );
    }

    try {
      const payload = authService.verifyToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        logAuthWarning(req, "Authentication failure", { reason: "TOKEN_REVOKED" });
        return next(
          new AppError(401, "Token has been revoked", "TOKEN_REVOKED"),
        );
      }
      
      req.context.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        roleId: payload.roleId || null,
      };
      return next();
    } catch (error) {
      logAuthWarning(req, "Authentication failure", {
        reason: error?.code || "AUTH_INVALID_TOKEN",
      });
      return next(error);
    }
  }

  return Object.freeze({
    optionalAuth,
    requireAuth,
  });
}

export { createAuthMiddleware };
