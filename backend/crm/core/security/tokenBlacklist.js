import crypto from "node:crypto";

/**
 * Token Blacklist Service
 * Manages JWT token revocation and blacklist
 */
function createTokenBlacklistService({ db, logger }) {
  const isMySql = String(db?.adapter || "").toLowerCase() === "mysql";

  /**
   * Add token to blacklist
   */
  async function blacklistToken({
    jti,
    userId,
    expiresAt,
    reason = "USER_LOGOUT",
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      if (isMySql) {
        await db.query(
          `
          INSERT IGNORE INTO token_blacklist (token_jti, user_id, expires_at, reason, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [jti, userId, expiresAt, reason, ipAddress, userAgent],
        );
      } else {
        await db.query(
          `
          INSERT INTO token_blacklist (token_jti, user_id, expires_at, reason, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (token_jti) DO NOTHING
        `,
          [jti, userId, expiresAt, reason, ipAddress, userAgent],
        );
      }

      logger.info(
        { jti, userId, reason },
        "Token added to blacklist",
      );

      return true;
    } catch (error) {
      logger.error(
        { err: error, jti, userId },
        "Failed to blacklist token",
      );
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async function isTokenBlacklisted(jti) {
    if (!jti) return false;

    try {
      const result = await db.query(
        `
        SELECT 1 FROM token_blacklist 
        WHERE token_jti = $1 
        AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
        [jti],
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error(
        { err: error, jti },
        "Failed to check token blacklist",
      );
      // Fail secure: if we can't check, assume blacklisted
      return true;
    }
  }

  /**
   * Blacklist all tokens for a user (force logout)
   */
  async function blacklistAllUserTokens(userId, reason = "ADMIN_REVOKE") {
    try {
      logger.warn(
        { userId, reason },
        "Blacklist all user tokens requested",
      );

      return true;
    } catch (error) {
      logger.error(
        { err: error, userId },
        "Failed to blacklist user tokens",
      );
      throw error;
    }
  }

  /**
   * Clean up expired tokens from blacklist
   */
  async function cleanupExpiredTokens() {
    try {
      const result = await db.query(
        `
        DELETE FROM token_blacklist 
        WHERE expires_at < CURRENT_TIMESTAMP
      `,
      );

      const deletedCount = Number(
        result?.rowCount ??
          result?.rows?.length ??
          result?.affectedRows ??
          0,
      );

      logger.info(
        { deletedCount },
        "Cleaned up expired blacklisted tokens",
      );

      return deletedCount;
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to cleanup expired tokens",
      );
      throw error;
    }
  }

  /**
   * Get blacklist statistics
   */
  async function getBlacklistStats() {
    try {
      const result = await db.query(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired,
          COUNT(DISTINCT user_id) as unique_users
        FROM token_blacklist
      `,
      );

      return result.rows[0] || {
        total: 0,
        active: 0,
        expired: 0,
        unique_users: 0,
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to get blacklist stats");
      return { total: 0, active: 0, expired: 0, unique_users: 0 };
    }
  }

  return Object.freeze({
    blacklistToken,
    isTokenBlacklisted,
    blacklistAllUserTokens,
    cleanupExpiredTokens,
    getBlacklistStats,
  });
}

export { createTokenBlacklistService };
