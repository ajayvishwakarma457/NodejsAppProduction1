"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
/* ------------------------------------------------------------------ */
// Error type guards (duck-typing to avoid direct Mongoose/JWT imports)
/* ------------------------------------------------------------------ */
const isMongooseValidationError = (err) => err.name === "ValidationError";
const isMongooseCastError = (err) => err.name === "CastError";
const isMongoDuplicateKeyError = (err) => err.code === 11000;
const isJwtExpiredError = (err) => err.name === "TokenExpiredError";
const isJwtError = (err) => err.name === "JsonWebTokenError";
const isSyntaxError = (err) => err instanceof SyntaxError && "body" in err;
const isMulterError = (err) => err.name === "MulterError" && "code" in err;
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const isOperationalError = (err) => {
    if (err instanceof ApiError_1.ApiError)
        return err.isOperational;
    if (err instanceof zod_1.ZodError)
        return true;
    if (isMongooseValidationError(err) || isMongooseCastError(err))
        return true;
    if (isMongoDuplicateKeyError(err))
        return true;
    if (isJwtExpiredError(err) || isJwtError(err))
        return true;
    if (isSyntaxError(err))
        return true;
    if (isMulterError(err))
        return true;
    return false;
};
const redactBody = (body) => {
    if (!body || typeof body !== "object")
        return body;
    const clone = { ...body };
    const sensitive = new Set(["password", "token", "refreshToken", "secret", "authorization", "apiKey"]);
    for (const key of Object.keys(clone)) {
        if (sensitive.has(key.toLowerCase())) {
            clone[key] = "[REDACTED]";
        }
    }
    return clone;
};
const buildRequestContext = (req) => {
    const ctx = {
        method: req.method,
        url: req.originalUrl || req.url,
        requestId: req.requestId,
        ip: req.ip
    };
    if (req.user?.id)
        ctx.userId = req.user.id;
    if (req.body)
        ctx.body = redactBody(req.body);
    if (req.query && Object.keys(req.query).length > 0)
        ctx.query = req.query;
    return ctx;
};
const getMulterMessage = (code) => {
    const map = {
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
const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        // Delegate to Express default error handler to close the connection safely
        return next(err);
    }
    let statusCode = http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details = undefined;
    if (err instanceof ApiError_1.ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }
    else if (err instanceof zod_1.ZodError) {
        statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        message = "Validation failed";
        details = err.flatten().fieldErrors;
    }
    else if (isMongooseValidationError(err)) {
        statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        message = "Validation failed";
        const mongooseErr = err;
        if (mongooseErr.errors) {
            details = Object.entries(mongooseErr.errors).map(([field, e]) => ({
                field,
                message: e.message
            }));
        }
    }
    else if (isMongooseCastError(err)) {
        statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        message = "Invalid value for field";
        const castErr = err;
        details = { field: castErr.path, value: castErr.value };
    }
    else if (isMongoDuplicateKeyError(err)) {
        statusCode = http_status_codes_1.StatusCodes.CONFLICT;
        message = "Duplicate field value";
        details = err.keyValue;
    }
    else if (isJwtExpiredError(err)) {
        statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
        message = "Token expired";
    }
    else if (isJwtError(err)) {
        statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
        message = "Invalid token";
    }
    else if (isSyntaxError(err)) {
        statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        message = "Invalid JSON payload";
    }
    else if (isMulterError(err)) {
        statusCode = http_status_codes_1.StatusCodes.BAD_REQUEST;
        message = getMulterMessage(err.code);
        details = { code: err.code, field: err.field };
    }
    const operational = isOperationalError(err);
    const isProd = env_1.env.NODE_ENV === "production";
    // Preserve original values for logging before sanitizing the response
    const originalMessage = err.message;
    const originalDetails = details;
    // Sanitize non-operational 500s in production
    if (statusCode >= 500 && !operational && isProd) {
        message = "Internal server error";
        details = undefined;
    }
    // Log with full original context (never sanitized)
    const logMeta = {
        ...buildRequestContext(req),
        errorName: err.name,
        originalMessage,
        statusCode,
        operational,
        stack: err.stack,
        details: originalDetails
    };
    if (err.cause) {
        logMeta.cause = err.cause;
    }
    if (statusCode >= 500) {
        logger_1.logger.error(message, logMeta);
    }
    else {
        logger_1.logger.warn(message, logMeta);
    }
    // Response
    const response = {
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
exports.errorMiddleware = errorMiddleware;
