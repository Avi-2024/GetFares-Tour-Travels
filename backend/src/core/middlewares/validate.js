const { AppError } = require('../errors');

function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR', result.error.flatten()));
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = { validateRequest };
