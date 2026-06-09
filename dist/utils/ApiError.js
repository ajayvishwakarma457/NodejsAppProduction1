"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    isOperational;
    details;
    constructor(statusCode, message, details, isOperational = true) {
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
    static badRequest(message, details) {
        return new ApiError(400, message, details);
    }
    static unauthorized(message = "Unauthorized", details) {
        return new ApiError(401, message, details);
    }
    static forbidden(message = "Forbidden", details) {
        return new ApiError(403, message, details);
    }
    static notFound(message = "Not found", details) {
        return new ApiError(404, message, details);
    }
    static conflict(message, details) {
        return new ApiError(409, message, details);
    }
    static tooManyRequests(message = "Too many requests", details) {
        return new ApiError(429, message, details);
    }
    static internal(message = "Internal server error", details) {
        return new ApiError(500, message, details, false);
    }
}
exports.ApiError = ApiError;
