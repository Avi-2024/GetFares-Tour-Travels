import crypto from "node:crypto";
import { AppError } from "../../core/errors/index.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 300;

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeIp(value) {
  return String(value || "")
    .trim()
    .replace(/^::ffff:/, "");
}

function createPartnerIntegrationMiddleware({ db, logger }) {
  const requestWindows = new Map();

  function enforceRateLimit(clientId) {
    const now = Date.now();
    const current = requestWindows.get(clientId);
    if (!current || current.resetAt <= now) {
      requestWindows.set(clientId, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    current.count += 1;
    if (current.count > MAX_REQUESTS) {
      throw new AppError(
        429,
        "Integration rate limit exceeded",
        "INTEGRATION_RATE_LIMITED",
      );
    }
  }

  async function requirePartnerApiKey(req, _res, next) {
    try {
      const clientId = String(req.headers["x-client-id"] || "").trim();
      const apiKey = String(req.headers["x-api-key"] || "").trim();
      if (!clientId || !apiKey) {
        throw new AppError(
          401,
          "Integration credentials required",
          "INTEGRATION_AUTH_REQUIRED",
        );
      }

      const result = await db.query(
        `SELECT id, name, api_key_hash, scopes, allowed_ips, is_active
         FROM integration_clients
         WHERE id = ?
         LIMIT 1`,
        [clientId],
      );
      const client = result.rows[0];
      if (!client || !client.is_active) {
        throw new AppError(
          401,
          "Invalid integration credentials",
          "INTEGRATION_AUTH_INVALID",
        );
      }

      const providedHash = sha256(apiKey);
      const storedHash = Buffer.from(String(client.api_key_hash || ""), "hex");
      if (
        storedHash.length !== providedHash.length ||
        !crypto.timingSafeEqual(storedHash, providedHash)
      ) {
        throw new AppError(
          401,
          "Invalid integration credentials",
          "INTEGRATION_AUTH_INVALID",
        );
      }

      const allowedIps = parseJsonArray(client.allowed_ips).map(normalizeIp);
      const requestIp = normalizeIp(req.ip || req.socket?.remoteAddress);
      if (allowedIps.length && !allowedIps.includes(requestIp)) {
        throw new AppError(
          403,
          "Integration IP is not allowed",
          "INTEGRATION_IP_FORBIDDEN",
        );
      }

      enforceRateLimit(client.id);
      req.context.integration = {
        id: client.id,
        name: client.name,
        scopes: parseJsonArray(client.scopes),
      };

      void db
        .query(
          `UPDATE integration_clients
           SET last_used_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [client.id],
        )
        .catch((error) => {
          logger?.warn?.(
            {
              module: "partnerIntegration",
              clientId: client.id,
              error: error.message,
            },
            "Failed to update integration usage timestamp",
          );
        });
      return next();
    } catch (error) {
      logger?.warn?.(
        {
          module: "partnerIntegration",
          requestId: req.context?.requestId,
          code: error?.code,
        },
        "Partner integration authentication failed",
      );
      return next(error);
    }
  }

  function requireScope(scope) {
    return function enforceScope(req, _res, next) {
      const scopes = req.context?.integration?.scopes || [];
      if (scopes.includes("*") || scopes.includes(scope)) {
        return next();
      }
      return next(
        new AppError(
          403,
          "Integration scope is not allowed",
          "INTEGRATION_SCOPE_FORBIDDEN",
          { requiredScope: scope },
        ),
      );
    };
  }

  return Object.freeze({ requirePartnerApiKey, requireScope });
}

export { createPartnerIntegrationMiddleware };
