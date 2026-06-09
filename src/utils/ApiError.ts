export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown): ApiError {
    return new ApiError(401, message, details);
  }

  static forbidden(message = "Forbidden", details?: unknown): ApiError {
    return new ApiError(403, message, details);
  }

  static notFound(message = "Not found", details?: unknown): ApiError {
    return new ApiError(404, message, details);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, message, details);
  }

  static tooManyRequests(message = "Too many requests", details?: unknown): ApiError {
    return new ApiError(429, message, details);
  }

  static internal(message = "Internal server error", details?: unknown): ApiError {
    return new ApiError(500, message, details, false);
  }
}
