import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../core/errors/index.js";
import { DEFAULT_ROLE } from "../../core/constants/index.js";


function createAuthService({
  repository,
  logger,
  events,
  authConfig,
  rolesService,
}) {
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
    const accessToken = jwt.sign(
      {
        sub: serializedUser.id,
        email: serializedUser.email,
        role: serializedUser.role,
        roleId: serializedUser.roleId,
      },
      authConfig.jwtAccessSecret,
      { expiresIn: authConfig.jwtAccessExpiresIn },
    );

    return {
      accessToken,
      user: serializedUser,
    };
  }

  return Object.freeze({
    verifyToken,
    buildAuthResponse,
    serializeUser,

    async register(payload) {
      const existing = await repository.findUserByEmail(payload.email);
      if (existing) {
        throw new AppError(
          409,
          "Email is already registered",
          "AUTH_EMAIL_EXISTS",
        );
      }

      const passwordHash = await bcrypt.hash(payload.password, 12);
      const desiredRole =
        payload.role || authConfig.defaultRole || DEFAULT_ROLE;
      const resolvedRole = rolesService ?
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
      return buildAuthResponse(user);
    },

    async login(payload, sessionContext = {}) {
      const user = await repository.findUserByEmail(payload.email);
      if (!user || !user.passwordHash) {
        throw new AppError(
          401,
          "Invalid credentials",
          "AUTH_INVALID_CREDENTIALS",
        );
      }

      const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
      if (!isMatch) {
        throw new AppError(
          401,
          "Invalid credentials",
          "AUTH_INVALID_CREDENTIALS",
        );
      }

      if (!user.isActive) {
        throw new AppError(
          403,
          "User account is inactive",
          "AUTH_INACTIVE_USER",
        );
      }

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

    async logout(userId) {
      const user = await repository.findUserById(userId);
      if (!user) {
        throw new AppError(404, "User not found", "AUTH_USER_NOT_FOUND");
      }
      await repository.clearLoginPresence(userId);
      return { success: true };
    },
  });
}

export { createAuthService };
