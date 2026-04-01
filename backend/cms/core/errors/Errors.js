/**
 * Base Application Error
 * Open for extension, closed for modification
 */
export class AppError extends Error {
  constructor(statusCode, message, code = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(400, message, 'VALIDATION_ERROR');
    this.field = field;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Duplicate Error
 */
export class DuplicateError extends AppError {
  constructor(resource, field) {
    super(400, `${resource} with this ${field} already exists`, 'DUPLICATE');
    this.resource = resource;
    this.field = field;
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message) {
    super(409, message, 'CONFLICT');
  }
}

/**
 * Error Handler Middleware Class
 */
export class ErrorHandler {
  static handle(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'Internal Server Error';

    console.error('[Error]', {
      statusCode,
      code,
      message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  static notFound(req, res) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  }
}
