import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

/* ------------------------------------------------------------------ */
// Error type guards (duck-typing to avoid direct Mongoose/JWT imports)
/* ------------------------------------------------------------------ */

const isMongooseValidationError = (err: Error): boolean => err.name === "ValidationError";
const isMongooseCastError = (err: Error): boolean => err.name === "CastError";

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

const isMongoDuplicateKeyError = (err: Error): err is MongoError =>
  (err as MongoError).code === 11000;

const isJwtExpiredError = (err: Error): boolean => err.name === "TokenExpiredError";
const isJwtError = (err: Error): boolean => err.name === "JsonWebTokenError";

const isSyntaxError = (err: Error): err is SyntaxError & { body?: unknown } =>
  err instanceof SyntaxError && "body" in err;

interface MulterLikeError extends Error {
  code: string;
  field?: string;
}

const isMulterError = (err: Error): err is MulterLikeError =>
  err.name === "MulterError" && "code" in err;

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const isOperationalError = (err: Error): boolean => {
  if (err instanceof ApiError) return err.isOperational;
  if (err instanceof ZodError) return true;
  if (isMongooseValidationError(err) || isMongooseCastError(err)) return true;
  if (isMongoDuplicateKeyError(err)) return true;
  if (isJwtExpiredError(err) || isJwtError(err)) return true;
  if (isSyntaxError(err)) return true;
  if (isMulterError(err)) return true;
  return false;
};

const redactBody = (body: unknown): unknown => {
  if (!body || typeof body !== "object") return body;
  const clone = { ...body } as Record<string, unknown>;
  const sensitive = new Set(["password", "token", "refreshToken", "secret", "authorization", "apiKey"]);
  for (const key of Object.keys(clone)) {
    if (sensitive.has(key.toLowerCase())) {
      clone[key] = "[REDACTED]";
    }
  }
  return clone;
};

const buildRequestContext = (req: Request): Record<string, unknown> => {
  const ctx: Record<string, unknown> = {
    method: req.method,
    url: req.originalUrl || req.url,
    requestId: req.requestId,
    ip: req.ip
  };
  if (req.user?.id) ctx.userId = req.user.id;
  if (req.body) ctx.body = redactBody(req.body);
  if (req.query && Object.keys(req.query).length > 0) ctx.query = req.query;
  return ctx;
};

const getMulterMessage = (code: string): string => {
  const map: Record<string, string> = {
    LIMIT_FILE_SIZE: "File too large",
    LIMIT_FILE_COUNT: "Too many files",
    LIMIT_UNEXPECTED_FILE: "Unexpected file field",
    LIMIT_PART_COUNT: "Too many parts",
    LIMIT_FIELD_KEY: "Field name too long",
    LIMIT_FIELD_VALUE: "Field value too long",
    LIMIT_FIELD_COUNT: "Too many fields",
    MISSING_FIELD_NAME: "Missing field name"
  };
  return map[code] || "File upload error";
};

/* ------------------------------------------------------------------ */
// Main middleware
/* ------------------------------------------------------------------ */

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    // Delegate to Express default error handler to close the connection safely
    return next(err);
  }

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let details: unknown = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation failed";
    details = err.flatten().fieldErrors;
  } else if (isMongooseValidationError(err)) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation failed";
    const mongooseErr = err as Error & { errors?: Record<string, { message: string }> };
    if (mongooseErr.errors) {
      details = Object.entries(mongooseErr.errors).map(([field, e]) => ({
        field,
        message: e.message
      }));
    }
  } else if (isMongooseCastError(err)) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid value for field";
    const castErr = err as Error & { path?: string; value?: unknown };
    details = { field: castErr.path, value: castErr.value };
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = StatusCodes.CONFLICT;
    message = "Duplicate field value";
    details = err.keyValue;
  } else if (isJwtExpiredError(err)) {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Token expired";
  } else if (isJwtError(err)) {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Invalid token";
  } else if (isSyntaxError(err)) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid JSON payload";
  } else if (isMulterError(err)) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = getMulterMessage(err.code);
    details = { code: err.code, field: err.field };
  }

  const operational = isOperationalError(err);
  const isProd = env.NODE_ENV === "production";

  // Preserve original values for logging before sanitizing the response
  const originalMessage = err.message;
  const originalDetails = details;

  // Sanitize non-operational 500s in production
  if (statusCode >= 500 && !operational && isProd) {
    message = "Internal server error";
    details = undefined;
  }

  // Log with full original context (never sanitized)
  const logMeta: Record<string, unknown> = {
    ...buildRequestContext(req),
    errorName: err.name,
    originalMessage,
    statusCode,
    operational,
    stack: err.stack,
    details: originalDetails
  };

  if ((err as Error & { cause?: unknown }).cause) {
    logMeta.cause = (err as Error & { cause?: unknown }).cause;
  }

  if (statusCode >= 500) {
    logger.error(message, logMeta);
  } else {
    logger.warn(message, logMeta);
  }

  // Response
  const response: Record<string, unknown> = {
    success: false,
    message,
    requestId: req.requestId
  };

  if (details !== undefined) {
    response.details = details;
  }

  if (!isProd) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
