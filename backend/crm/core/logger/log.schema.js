const LOG_LEVELS = Object.freeze(["info", "warn", "error"]);

const SENSITIVE_KEYS = Object.freeze(
  new Set([
    "password",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "secret",
    "otp",
    "card",
    "cardnumber",
    "cvv",
  ]),
);

const MAX_METADATA_DEPTH = 4;

function sanitizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function shouldRedactKey(key) {
  const normalized = sanitizeKey(key);
  if (!normalized) {
    return false;
  }
  if (SENSITIVE_KEYS.has(normalized)) {
    return true;
  }
  for (const token of SENSITIVE_KEYS) {
    if (normalized.includes(token)) {
      return true;
    }
  }
  return false;
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > MAX_METADATA_DEPTH) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return value.length > 4000 ? `${value.slice(0, 4000)}...` : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const safeObject = {};
    for (const [key, nested] of Object.entries(value)) {
      if (shouldRedactKey(key)) {
        safeObject[key] = "[REDACTED]";
        continue;
      }
      safeObject[key] = sanitizeValue(nested, depth + 1);
    }
    return safeObject;
  }

  return String(value);
}

function normalizeLogLevel(level) {
  const normalized = String(level || "info").toLowerCase();
  return LOG_LEVELS.includes(normalized) ? normalized : "info";
}

function normalizeMessage(message) {
  const text = String(message || "").trim();
  return text || "Log entry";
}

function buildLogDocument({
  level,
  message,
  module,
  fileName,
  functionName,
  requestId,
  userId,
  method,
  url,
  statusCode,
  responseTime,
  stack,
  metadata,
}) {
  return {
    level: normalizeLogLevel(level),
    message: normalizeMessage(message),
    module: module ? String(module) : "app",
    fileName: fileName ? String(fileName) : null,
    functionName: functionName ? String(functionName) : null,
    requestId: requestId ? String(requestId) : null,
    userId: userId ? String(userId) : null,
    method: method ? String(method) : null,
    url: url ? String(url) : null,
    statusCode: Number.isInteger(statusCode) ? statusCode : null,
    responseTime:
      typeof responseTime === "number" && Number.isFinite(responseTime) ?
        responseTime
      : null,
    stack: stack ? String(stack) : null,
    metadata: sanitizeValue(metadata ?? {}),
    createdAt: new Date(),
  };
}

export { LOG_LEVELS, buildLogDocument, sanitizeValue };
