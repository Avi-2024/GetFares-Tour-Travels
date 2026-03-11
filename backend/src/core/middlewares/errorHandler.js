const { AppError } = require('../errors');

function errorHandler(err, req, res, next) {
  const logger = req.log || console;

  if (err instanceof AppError) {
    logger.warn(
      {
        err,
        requestId: req.context?.requestId,
        code: err.code,
      },
      err.message,
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

  logger.error(
    {
      err,
      requestId: req.context?.requestId,
    },
    'Unhandled error',
  );

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: req.context?.requestId,
    },
  });
}

module.exports = { errorHandler };
