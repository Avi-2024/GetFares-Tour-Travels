import pino from "pino";
import { config } from "../config/index.js";
import { buildLogDocument, sanitizeValue } from "./log.schema.js";
import { MongoLogStore } from "./mongo-log.store.js";

const DEFAULT_LOG_LEVEL = "info";
const loggerStoreRegistry = new Map();
const RESERVED_CONTEXT_KEYS = new Set([
 
  "userId",
  "method",
  "url",
  "statusCode",
  "responseTime",
  "stack",
  "err",
  "error",
  "message",
  "metadata",
]);

function parseErrorSource(stack) {
  if (!stack) {
    return { fileName: null, functionName: null };
  }
  const lines = String(stack)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceLine = lines.find((line) => line.startsWith("at ")) || "";
  const match =
    sourceLine.match(/^at\s+(.+?)\s+\((.+)\)$/) ||
    sourceLine.match(/^at\s+(.+)$/);
  if (!match) {
    return { fileName: null, functionName: null };
  }
  if (match.length === 3) {
    return { functionName: match[1], fileName: match[2] };
  }
  return { functionName: null, fileName: match[1] };
}

function normalizeLogCall(args) {
  const [first, second] = args;
  let message = "";
  let metadata = {};
  let error = null;

  if (typeof first === "string") {
    message = first;
    if (second instanceof Error) {
      error = second;
    } else if (second && typeof second === "object") {
      metadata = second;
    } else if (typeof second === "string") {
      message = `${first} ${second}`.trim();
    }
  } else if (first instanceof Error) {
    error = first;
    message = typeof second === "string" ? second : first.message;
  } else if (first && typeof first === "object") {
    metadata = first;
    if (typeof second === "string") {
      message = second;
    } else if (metadata.message && typeof metadata.message === "string") {
      message = metadata.message;
    }

    if (metadata.err instanceof Error) {
      error = metadata.err;
    } else if (metadata.error instanceof Error) {
      error = metadata.error;
    }
  }

  if (!message) {
    message = error?.message || "Log entry";
  }

  return { message, metadata, error };
}

function sanitizeMetadataForConsole(metadata) {
  const safe = sanitizeValue(metadata);
  if (!safe || typeof safe !== "object" || Array.isArray(safe)) {
    return { metadata: safe };
  }
  return safe;
}

function buildMetadataPayload(context, error) {
  const contextualMetadata = {};
  for (const [key, value] of Object.entries(context || {})) {
    if (RESERVED_CONTEXT_KEYS.has(key)) {
      continue;
    }
    contextualMetadata[key] = value;
  }

  const explicitMetadata =
    (
      context?.metadata &&
      typeof context.metadata === "object" &&
      !Array.isArray(context.metadata)
    ) ?
      context.metadata
    : {};

  return {
    ...contextualMetadata,
    ...explicitMetadata,
    err:
      error ?
        {
          name: error.name,
          message: error.message,
        }
      : undefined,
  };
}

class AppLogger {
  constructor({ name, level, consoleLogger, mongoStore, baseContext = {} }) {
    this.name = name;
    this.level = level || DEFAULT_LOG_LEVEL;
    this.consoleLogger = consoleLogger;
    this.mongoStore = mongoStore;
    this.baseContext = baseContext;
  }

  child(context = {}) {
    return new AppLogger({
      name: this.name,
      level: this.level,
      consoleLogger: this.consoleLogger,
      mongoStore: this.mongoStore,
      baseContext: {
        ...this.baseContext,
        ...context,
      },
    });
  }

  async close() {
    await this.mongoStore?.close?.();
  }

  info(...args) {
    this.write("info", args);
  }

  debug(...args) {
    this.write("debug", args, { persist: false });
  }

  warn(...args) {
    this.write("warn", args);
  }

  error(...args) {
    this.write("error", args);
  }

  write(level, args, options = {}) {
    const { message, metadata, error } = normalizeLogCall(args);
    const context = {
      ...this.baseContext,
      ...(metadata || {}),
    };
    const persist = options.persist ?? level !== "debug";
    const storeLevel = level === "debug" ? "info" : level;

    const stack = error?.stack || context.stack || null;
    const source = parseErrorSource(stack);
    const document = buildLogDocument({
      level: storeLevel,
      message,
      module: context.module || this.name,
      fileName: context.fileName || source.fileName,
      functionName: context.functionName || source.functionName,
      requestId: context.requestId,
      userId: context.userId,
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      responseTime: context.responseTime,
      stack,
      metadata: buildMetadataPayload(context, error),
    });

    const consoleMetadata = sanitizeMetadataForConsole(document.metadata);
    const pinoPayload = {
      module: document.module,
      fileName: document.fileName,
      functionName: document.functionName,
      requestId: document.requestId,
      userId: document.userId,
      method: document.method,
      url: document.url,
      statusCode: document.statusCode,
      responseTime: document.responseTime,
      metadata: consoleMetadata,
      stack: document.stack,
    };

    this.consoleLogger[level]?.(pinoPayload, document.message);
    if (persist) {
      void this.mongoStore?.write(document);
    }
  }
}

function createStore({
  logDbUrl,
  logDbDirectUrl,
  logDbCollection,
  fallbackLogger,
}) {
  const key = `${logDbUrl || ""}|${logDbDirectUrl || ""}|${logDbCollection || ""}`;
  if (!key.trim()) {
    return null;
  }

  if (loggerStoreRegistry.has(key)) {
    return loggerStoreRegistry.get(key);
  }

  const store = new MongoLogStore({
    connectionUrl: logDbUrl,
    directConnectionUrl: logDbDirectUrl,
    collectionName: logDbCollection,
    fallbackLogger,
  });
  loggerStoreRegistry.set(key, store);
  return store;
}

function createLogger(options = {}) {
  const level = options.level || config.logger.level || DEFAULT_LOG_LEVEL;
  const name = options.name || "backend";
  const baseContext = options.baseContext || {};
  const fallbackConsoleLogger =
    options.consoleLogger ||
    pino({
      level,
      base: { service: name },
      redact: {
        paths: [
          "*.password",
          "*.token",
          "*.authorization",
          "*.cookie",
          "*.secret",
        ],
        censor: "[REDACTED]",
      },
    });

  const mongoStore = createStore({
    logDbUrl: options.logDbUrl || config.logger.logDbUrl,
    logDbDirectUrl: options.logDbDirectUrl || config.logger.logDbDirectUrl,
    logDbCollection: options.logDbCollection || config.logger.logDbCollection,
    fallbackLogger: fallbackConsoleLogger,
  });

  return new AppLogger({
    name,
    level,
    consoleLogger: fallbackConsoleLogger,
    mongoStore,
    baseContext,
  });
}

const logger = createLogger({ name: config.app.name || "backend" });

export { AppLogger, createLogger, logger };
