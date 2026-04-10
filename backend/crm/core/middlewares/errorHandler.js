import { AppError } from "../errors/index.js";

function errorHandler(err, req, res, next) {
  const logger = req.logger || req.app?.locals?.logger;
  const isProduction = process.env.NODE_ENV === "production";

  const baseContext = {
    module: "http",
    fileName: "errorHandler.js",
    functionName: "errorHandler",
    requestId: req.context?.requestId,
    userId: req.context?.user?.id,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: err?.statusCode || err?.status || 500,
  };

  if (err instanceof AppError) {
    const isValidationError = err.code === "VALIDATION_ERROR";
    const isAuthError =
      err.code?.startsWith("AUTH_") || err.code === "TOKEN_REVOKED";

    const warnMessage =
      isValidationError ? "Validation failure"
      : isAuthError ? "Authentication failure"
      : err.message;

    logger?.warn(
      {
        ...baseContext,
        metadata: {
          code: err.code,
          details: err.details,
        },
      },
      warnMessage,
    );

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
        requestId: req.context?.requestId,
      },
    });
  }

  logger?.error(
    {
      ...baseContext,
      stack: err?.stack,
      metadata: {
        code: "INTERNAL_SERVER_ERROR",
      },
    },
    "Unhandled exception",
  );

  return res.status(500).json({
    error: {
      message: isProduction
        ? "Internal server error"
        : err.message || "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      requestId: req.context?.requestId,
      details: isProduction ? undefined : err.stack,
    },
  });
}

export { errorHandler };
