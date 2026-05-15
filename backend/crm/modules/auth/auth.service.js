import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";
import { DEFAULT_ROLE } from "../../core/constants/index.js";

const CRM_LOGIN_BLOCKED_ROLE_TOKENS = new Set([
  "cms_full_access",
  "cms_access",
  "crm_full_access",
]);

function createAuthService({
  repository,
  logger,
  events,
  authConfig,
  rolesService,
  tokenBlacklistService,
}) {
  const bcryptRounds = Number.isInteger(Number(authConfig?.bcryptRounds))
    ? Number(authConfig.bcryptRounds)
    : 8;

  function serializeUser(user) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roleId: user.roleId,
      roleCountry: user.roleCountry ?? null,
      agentCountry: user.agentCountry ?? null,
      country: user.agentCountry ?? user.roleCountry ?? null,
      agentType: user.agentType ?? null,
      isActive: user.isActive,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  function verifyToken(token) {
    try {
      return jwt.verify(token, authConfig.jwtAccessSecret);
    } catch (error) {
      throw new AppError(
        401,
        "Invalid or expired access token",
        "AUTH_INVALID_TOKEN",
      );
    }
  }

  function buildAuthResponse(user) {
    const serializedUser = serializeUser(user);
    const jti = crypto.randomUUID(); // Unique token ID for blacklist

    const accessToken = jwt.sign(
      {
        sub: serializedUser.id,
        email: serializedUser.email,
        role: serializedUser.role,
        roleId: serializedUser.roleId,
        jti, // Add JTI claim for token revocation
      },
      authConfig.jwtAccessSecret,
      { expiresIn: authConfig.jwtAccessExpiresIn },
    );

    return {
      accessToken,
      user: serializedUser,
    };
  }

  function assertCrmLoginRoleAllowed(user) {
    const normalizedRole = String(user?.role || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (!normalizedRole) {
      throw new AppError(
        403,
        "This account does not have a CRM role assigned",
        "AUTH_CRM_ROLE_REQUIRED",
      );
    }
    if (CRM_LOGIN_BLOCKED_ROLE_TOKENS.has(normalizedRole)) {
      throw new AppError(
        403,
        "CMS account cannot login to CRM. Please use CMS login.",
        "AUTH_CMS_ROLE_BLOCKED",
      );
    }
  }

  /**
   * Check if token is blacklisted
   */
  async function isTokenBlacklisted(token) {
    if (!tokenBlacklistService) return false;

    try {
      const decoded = jwt.decode(token);
      if (!decoded?.jti) return false;

      return await tokenBlacklistService.isTokenBlacklisted(decoded.jti);
    } catch (error) {
      logger.error({ err: error }, "Failed to check token blacklist");
      return false;
    }
  }

  return Object.freeze({
    verifyToken,
    buildAuthResponse,
    serializeUser,
    isTokenBlacklisted,

    async register(payload) {
      const startedAt = Date.now();
      logger.info(
        {
          module: "auth",
          fileName: "auth.service.js",
          functionName: "register",
          metadata: { email: payload.email },
        },
        "User registration started",
      );
      try {
        const existing = await repository.findUserByEmail(payload.email);
        if (existing) {
          logger.warn(
            {
              module: "auth",
              fileName: "auth.service.js",
              functionName: "register",
              metadata: { email: payload.email, reason: "AUTH_EMAIL_EXISTS" },
            },
            "Validation failure",
          );
          throw new AppError(
            409,
            "Email is already registered",
            "AUTH_EMAIL_EXISTS",
          );
        }

        const passwordHash = await bcrypt.hash(payload.password, bcryptRounds);
        const desiredRole =
          payload.role || authConfig.defaultRole || DEFAULT_ROLE;
        const resolvedRole =
          rolesService ?
            await rolesService.resolveRole({
              role: desiredRole,
              roleId: payload.roleId,
            })
          : null;
        const user = await repository.createUser({
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone || null,
          passwordHash,
          role: desiredRole,
          roleId: resolvedRole?.id || payload.roleId || null,
          isActive: true,
        });

        events.emitRegistered(user);
        logger.info(
          {
            module: "auth",
            fileName: "auth.service.js",
            functionName: "register",
            userId: user.id,
            metadata: {
              email: user.email,
              responseMs: Date.now() - startedAt,
              bcryptRounds,
            },
          },
          "User created",
        );
        return buildAuthResponse(user);
      } catch (error) {
        const duplicate =
          error?.code === "23505" ||
          error?.code === "ER_DUP_ENTRY" ||
          Number(error?.errno) === 1062;
        if (duplicate) {
          throw new AppError(
            409,
            "Email is already registered",
            "AUTH_EMAIL_EXISTS",
          );
        }
        throw error;
      }
    },

    async login(payload, sessionContext = {}) {
      const startedAt = Date.now();
      logger.info(
        {
          module: "auth",
          fileName: "auth.service.js",
          functionName: "login",
          metadata: { email: payload.email },
        },
        "Login started",
      );

      const user = await repository.findUserByEmail(payload.email);
      if (!user || !user.passwordHash) {
        logger.warn(
          {
            module: "auth",
            fileName: "auth.service.js",
            functionName: "login",
            metadata: {
              email: payload.email,
              reason: "AUTH_INVALID_CREDENTIALS",
              responseMs: Date.now() - startedAt,
            },
          },
          "Invalid password",
        );
        throw new AppError(
          401,
          "Invalid credentials",
          "AUTH_INVALID_CREDENTIALS",
        );
      }

      const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
      if (!isMatch) {
        logger.warn(
          {
            module: "auth",
            fileName: "auth.service.js",
            functionName: "login",
            userId: user.id,
            metadata: {
              email: payload.email,
              reason: "AUTH_INVALID_CREDENTIALS",
              responseMs: Date.now() - startedAt,
            },
          },
          "Invalid password",
        );
        throw new AppError(
          401,
          "Invalid credentials",
          "AUTH_INVALID_CREDENTIALS",
        );
      }

      if (!user.isActive) {
        logger.warn(
          {
            module: "auth",
            fileName: "auth.service.js",
            functionName: "login",
            userId: user.id,
            metadata: {
              email: payload.email,
              reason: "AUTH_INACTIVE_USER",
              responseMs: Date.now() - startedAt,
            },
          },
          "Permission denied",
        );
        throw new AppError(
          403,
          "User account is inactive",
          "AUTH_INACTIVE_USER",
        );
      }

      assertCrmLoginRoleAllowed(user);

      try {
        await repository.saveSession({
          userId: user.id,
          ipAddress: sessionContext.ipAddress,
          deviceInfo: sessionContext.deviceInfo,
        });
        await repository.markLogin(user.id);
      } catch (error) {
        logger.warn(
          { err: error, userId: user.id },
          "Unable to persist login audit record",
        );
      }

      events.emitLoggedIn(user);
      logger.info(
        {
          module: "auth",
          fileName: "auth.service.js",
          functionName: "login",
          userId: user.id,
          metadata: { email: user.email, responseMs: Date.now() - startedAt },
        },
        "Login success",
      );
      return buildAuthResponse(user);
    },

    async getProfile(userId) {
      const user = await repository.findUserById(userId);
      if (!user) {
        throw new AppError(404, "User not found", "AUTH_USER_NOT_FOUND");
      }

      return serializeUser(user);
    },

    async toggleActive(userId, active) {
      const user = await repository.findUserById(userId);
      if (!user) {
        throw new AppError(404, "User not found", "AUTH_USER_NOT_FOUND");
      }
      const updated = await repository.setActiveStatus(userId, active);
      return serializeUser(updated);
    },

    async logout(userId, token, sessionContext = {}) {
      const user = await repository.findUserById(userId);
      if (!user) {
        throw new AppError(404, "User not found", "AUTH_USER_NOT_FOUND");
      }

      // Blacklist the token if service is available
      if (tokenBlacklistService && token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded?.jti && decoded?.exp) {
            await tokenBlacklistService.blacklistToken({
              jti: decoded.jti,
              userId,
              expiresAt: new Date(decoded.exp * 1000),
              reason: "USER_LOGOUT",
              ipAddress: sessionContext.ipAddress,
              userAgent: sessionContext.deviceInfo,
            });
          }
        } catch (error) {
          logger.warn(
            { err: error, userId },
            "Failed to blacklist token on logout",
          );
        }
      }

      await repository.clearLoginPresence(userId);
      logger.info(
        {
          module: "auth",
          fileName: "auth.service.js",
          functionName: "logout",
          userId,
        },
        "Logout success",
      );
      return { success: true };
    },
  });
}

export { createAuthService };
