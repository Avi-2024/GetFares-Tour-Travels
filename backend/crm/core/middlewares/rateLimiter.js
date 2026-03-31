import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const createAuthRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
      error: {
        message: "Too many authentication attempts. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skip: (req) => process.env.NODE_ENV === "test",
  });

/**
 * Rate limiter for registration endpoint
 * More lenient than login
 */
export const createRegisterRateLimiter = () =>
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
      error: {
        message: "Too many registration attempts. Please try again later.",
        code: "REGISTRATION_RATE_LIMIT",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test",
  });

/**
 * Rate limiter for token refresh endpoint
 */
export const createRefreshRateLimiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 refresh attempts
    message: {
      error: {
        message: "Too many token refresh attempts.",
        code: "REFRESH_RATE_LIMIT",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test",
  });

/**
 * General API rate limiter
 */
export const createApiRateLimiter = () =>
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      error: {
        message: "Too many requests. Please slow down.",
        code: "API_RATE_LIMIT",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "test",
  });
