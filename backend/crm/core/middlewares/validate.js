import { AppError } from "../errors/index.js";

function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const logger = req.logger || req.app?.locals?.logger;
      logger?.warn(
        {
          module: "validation",
          fileName: "validate.js",
          functionName: "validateRequest",
          requestId: req.context?.requestId,
          userId: req.context?.user?.id,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: 400,
          metadata: {
            issues: result.error.issues?.map((issue) => ({
              path: issue.path,
              message: issue.message,
              code: issue.code,
            })),
          },
        },
        "Validation failed",
      );

      return next(
        new AppError(
          400,
          "Validation failed",
          "VALIDATION_ERROR",
          result.error.flatten(),
        ),
      );
    }

    req.validated = result.data;
    return next();
  };
}

export { validateRequest };
