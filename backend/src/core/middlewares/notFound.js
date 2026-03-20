import { AppError } from "../errors/index.js";

function notFound(req, res, next) {
  next(
    new AppError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`,
      "NOT_FOUND",
    ),
  );
}

export { notFound };
