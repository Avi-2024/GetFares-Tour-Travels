function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  const code = err.code || "INTERNAL_ERROR";
  const logger = req.logger || req.app?.locals?.logger;

  logger?.error(
    {
      module: "cms",
      fileName: "errorHandler.js",
      functionName: "errorHandler",
      requestId: req.context?.requestId,
      userId: req.context?.user?.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      stack: err?.stack,
      metadata: {
        code,
      },
    },
    "Unhandled exception",
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

class AppError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || "APP_ERROR";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { errorHandler, notFound, AppError };
