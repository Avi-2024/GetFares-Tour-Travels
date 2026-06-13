function createRequestLoggingMiddleware({ logger }) {
  return function requestLoggingMiddleware(req, res, next) {
    const startedAt = Date.now();
    const requestId = req.context?.requestId;
    const userId = req.context?.user?.id || null;
    const method = req.method;
    const url = req.originalUrl || req.url;
    let settled = false;

    req.logger = logger;
    req.app.locals.logger = logger;

    logger.info(
      {
        module: "http",
        fileName: "requestLogger.js",
        functionName: "requestLoggingMiddleware",
        requestId,
        userId,
        method,
        url,
      },
      "Request started",
    );

    res.on("finish", () => {
      if (settled) {
        return;
      }
      settled = true;

      const responseTime = Date.now() - startedAt;
      const statusCode = res.statusCode;
      const payload = {
        module: "http",
        fileName: "requestLogger.js",
        functionName: "response.finish",
        requestId,
        userId: req.context?.user?.id || userId,
        integrationClientId: req.context?.integration?.id || null,
        method,
        url,
        statusCode,
        responseTime,
      };

      if (statusCode >= 500) {
        logger.error(payload, "Request failed");
        return;
      }

      if (statusCode >= 400) {
        logger.warn(payload, "Request ended with warning");
        return;
      }

      logger.info(payload, "Request completed");
    });

    res.on("close", () => {
      if (settled || res.writableEnded) {
        return;
      }
      settled = true;
      const responseTime = Date.now() - startedAt;
      logger.warn(
        {
          module: "http",
          fileName: "requestLogger.js",
          functionName: "response.close",
          requestId,
          userId: req.context?.user?.id || userId,
          method,
          url,
          statusCode: res.statusCode,
          responseTime,
        },
        "Request aborted by client",
      );
    });

    return next();
  };
}

export { createRequestLoggingMiddleware };
