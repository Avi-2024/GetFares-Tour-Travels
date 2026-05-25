import { AppError } from "../../core/errors/index.js";

function createAuthController({ service }) {
  function parseExpiresInMs(input) {
    if (!input) return 7 * 24 * 60 * 60 * 1000;
    if (typeof input === "number" && Number.isFinite(input)) return input * 1000;
    const raw = String(input).trim();
    const match = /^(\d+)\s*([smhd])?$/i.exec(raw);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = String(match[2] || "s").toLowerCase();
    if (unit === "s") return value * 1000;
    if (unit === "m") return value * 60 * 1000;
    if (unit === "h") return value * 60 * 60 * 1000;
    if (unit === "d") return value * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
  }

  function extractCookieToken(req, cookieName) {
    const cookieHeader = String(req.headers.cookie || "");
    if (!cookieHeader) return null;
    const segments = cookieHeader.split(";").map((part) => part.trim());
    for (const segment of segments) {
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

  return Object.freeze({
    async register(req, res) {
      const result = await service.register(req.validated.body);
      const authConfig = service.getAuthConfig?.() || {};
      const cookieName = String(authConfig.cookieName || "crm_access_token");
      const sameSite = String(authConfig.cookieSameSite || "lax").toLowerCase();
      const secure = Boolean(authConfig.cookieSecure);
      const maxAge = parseExpiresInMs(authConfig.jwtAccessExpiresIn);
      res.cookie(cookieName, result.accessToken, {
        httpOnly: true,
        secure,
        sameSite,
        maxAge,
        path: "/",
        ...(authConfig.cookieDomain ? { domain: authConfig.cookieDomain } : {}),
      });
      res.status(201).json({ data: { user: result.user } });
    },

    async login(req, res) {
      const forwarded = req.headers["x-forwarded-for"];
      const ipAddress = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : req.ip;

      const result = await service.login(req.validated.body, {
        ipAddress,
        deviceInfo: req.headers["user-agent"] || null,
      });
      const authConfig = service.getAuthConfig?.() || {};
      const cookieName = String(authConfig.cookieName || "crm_access_token");
      const sameSite = String(authConfig.cookieSameSite || "lax").toLowerCase();
      const secure = Boolean(authConfig.cookieSecure);
      const maxAge = parseExpiresInMs(authConfig.jwtAccessExpiresIn);

      res.cookie(cookieName, result.accessToken, {
        httpOnly: true,
        secure,
        sameSite,
        maxAge,
        path: "/",
        ...(authConfig.cookieDomain ? { domain: authConfig.cookieDomain } : {}),
      });

      res.status(200).json({
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    },

    async me(req, res) {
      const result = await service.getProfile(req.context.user.id);
      res.status(200).json({ data: result });
    },

    async toggleActive(req, res) {
      const active = req.body?.active;
      if (typeof active !== "boolean") {
        throw new AppError(
          400,
          "active must be a boolean value",
          "VALIDATION_ERROR",
        );
      }
      const result = await service.toggleActive(req.context.user.id, active);
      res.status(200).json({ data: result });
    },

    async logout(req, res) {
      const authConfig = service.getAuthConfig?.() || {};
      const cookieName = String(authConfig.cookieName || "crm_access_token");
      const tokenFromHeader = req.headers.authorization?.replace("Bearer ", "");
      const token = tokenFromHeader || extractCookieToken(req, cookieName);
      const forwarded = req.headers["x-forwarded-for"];
      const ipAddress = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : req.ip;
      
      const result = await service.logout(req.context.user.id, token, {
        ipAddress,
        deviceInfo: req.headers["user-agent"] || null,
      });
      res.clearCookie(cookieName, {
        httpOnly: true,
        secure: Boolean(authConfig.cookieSecure),
        sameSite: String(authConfig.cookieSameSite || "lax").toLowerCase(),
        path: "/",
        ...(authConfig.cookieDomain ? { domain: authConfig.cookieDomain } : {}),
      });
      res.status(200).json({ data: result });
    },
  });
}

export { createAuthController };
