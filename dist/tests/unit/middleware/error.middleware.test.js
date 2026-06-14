"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const error_middleware_1 = require("../../../middleware/error.middleware");
const notFound_middleware_1 = require("../../../middleware/notFound.middleware");
const requestId_middleware_1 = require("../../../middleware/requestId.middleware");
const role_middleware_1 = require("../../../middleware/role.middleware");
const ApiError_1 = require("../../../utils/ApiError");
const envModule = __importStar(require("../../../config/env"));
const mockRequest = (overrides = {}) => {
    return {
        method: 'GET',
        originalUrl: '/test',
        url: '/test',
        ip: '127.0.0.1',
        headers: {},
        body: {},
        user: undefined,
        requestId: 'req-test-123',
        get: vitest_1.vi.fn(),
        ...overrides,
    };
};
const mockResponse = () => {
    const res = {
        statusCode: 200,
        headersSent: false,
        status: vitest_1.vi.fn().mockReturnThis(),
        json: vitest_1.vi.fn().mockReturnThis(),
        setHeader: vitest_1.vi.fn().mockReturnThis(),
    };
    return res;
};
const mockNext = vitest_1.vi.fn();
vitest_1.vi.mock('../../../config/logger', () => ({
    logger: {
        error: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        info: vitest_1.vi.fn(),
        debug: vitest_1.vi.fn(),
    },
}));
const logger_1 = require("../../../config/logger");
(0, vitest_1.describe)('errorMiddleware', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('should handle ApiError operational and return status, message, details', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = new ApiError_1.ApiError(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Bad input', { field: 'name' });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            success: false,
            message: 'Bad input',
            details: { field: 'name' },
            requestId: 'req-test-123',
        }));
    });
    (0, vitest_1.it)('should handle non-operational 500 in production and sanitize response', () => {
        const originalEnv = envModule.env.NODE_ENV;
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');
        const req = mockRequest();
        const res = mockResponse();
        const error = new ApiError_1.ApiError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'DB crashed', undefined, false);
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Internal server error');
        (0, vitest_1.expect)(jsonCall.details).toBeUndefined();
        (0, vitest_1.expect)(jsonCall.stack).toBeUndefined();
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
    });
    (0, vitest_1.it)('should include stack trace in non-production for non-operational errors', () => {
        const originalEnv = envModule.env.NODE_ENV;
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('development');
        const req = mockRequest();
        const res = mockResponse();
        const error = new Error('Something broke');
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.stack).toBeDefined();
        (0, vitest_1.expect)(jsonCall.stack).toContain('Something broke');
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
    });
    (0, vitest_1.it)('should handle ZodError and return 400 with field errors', () => {
        const req = mockRequest();
        const res = mockResponse();
        const schema = zod_1.z.object({ name: zod_1.z.string() });
        const result = schema.safeParse({});
        if (result.success)
            throw new Error('Expected parse failure');
        const error = result.error;
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Validation failed');
        (0, vitest_1.expect)(jsonCall.details).toBeDefined();
    });
    (0, vitest_1.it)('should handle Mongoose ValidationError', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('Path `email` is required.'), {
            name: 'ValidationError',
            errors: {
                email: { message: 'Path `email` is required.' },
            },
        });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Validation failed');
        (0, vitest_1.expect)(jsonCall.details).toEqual([{ field: 'email', message: 'Path `email` is required.' }]);
    });
    (0, vitest_1.it)('should handle Mongoose CastError', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('Cast to ObjectId failed'), {
            name: 'CastError',
            path: 'taskId',
            value: 'invalid-id',
        });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Invalid value for field');
        (0, vitest_1.expect)(jsonCall.details).toEqual({ field: 'taskId', value: 'invalid-id' });
    });
    (0, vitest_1.it)('should handle MongoDB duplicate key error', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('E11000 duplicate key error'), {
            name: 'MongoServerError',
            code: 11000,
            keyValue: { email: 'dup@example.com' },
        });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.CONFLICT);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Duplicate field value');
        (0, vitest_1.expect)(jsonCall.details).toEqual({ email: 'dup@example.com' });
    });
    (0, vitest_1.it)('should handle JWT TokenExpiredError', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Token expired');
    });
    (0, vitest_1.it)('should handle JWT JsonWebTokenError', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('invalid token'), { name: 'JsonWebTokenError' });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Invalid token');
    });
    (0, vitest_1.it)('should handle SyntaxError from express.json()', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new SyntaxError('Unexpected token'), { body: '{' });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Invalid JSON payload');
    });
    (0, vitest_1.it)('should return generic 500 for unknown errors in production', () => {
        const originalEnv = envModule.env.NODE_ENV;
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');
        const req = mockRequest();
        const res = mockResponse();
        const error = new Error('Secret leak');
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Internal server error');
        (0, vitest_1.expect)(jsonCall.stack).toBeUndefined();
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
    });
    (0, vitest_1.it)('should delegate to next(err) when headers already sent', () => {
        const req = mockRequest();
        const res = mockResponse();
        res.headersSent = true;
        const error = new Error('Late error');
        const next = vitest_1.vi.fn();
        (0, vitest_1.expect)(() => (0, error_middleware_1.errorMiddleware)(error, req, res, next)).not.toThrow();
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.json).not.toHaveBeenCalled();
        (0, vitest_1.expect)(next).toHaveBeenCalledWith(error);
    });
    (0, vitest_1.it)('should log with structured context including userId and redacted body', () => {
        const req = mockRequest({
            method: 'POST',
            originalUrl: '/api/v1/login',
            user: { id: 'user-42', email: 'a@example.com', role: 'member' },
            body: { email: 'a@example.com', password: 'secret123' },
        });
        const res = mockResponse();
        const error = ApiError_1.ApiError.badRequest('Invalid credentials');
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(logger_1.logger.warn).toHaveBeenCalledWith('Invalid credentials', vitest_1.expect.objectContaining({
            method: 'POST',
            url: '/api/v1/login',
            userId: 'user-42',
            requestId: 'req-test-123',
            body: vitest_1.expect.objectContaining({ password: '[REDACTED]' }),
        }));
    });
    (0, vitest_1.it)('should log 500 errors at error level', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = new Error('DB connection lost');
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(logger_1.logger.error).toHaveBeenCalledWith('Internal server error', vitest_1.expect.objectContaining({
            errorName: 'Error',
            statusCode: 500,
            operational: false,
        }));
    });
    (0, vitest_1.it)('should handle MulterError and return 400 with code info', () => {
        const req = mockRequest();
        const res = mockResponse();
        const error = Object.assign(new Error('File too large'), {
            name: 'MulterError',
            code: 'LIMIT_FILE_SIZE',
            field: 'avatar',
        });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.BAD_REQUEST);
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('File too large');
        (0, vitest_1.expect)(jsonCall.details).toEqual({ code: 'LIMIT_FILE_SIZE', field: 'avatar' });
    });
    (0, vitest_1.it)('should log original details even when response is sanitized in production', () => {
        const originalEnv = envModule.env.NODE_ENV;
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');
        const req = mockRequest();
        const res = mockResponse();
        const error = new ApiError_1.ApiError(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'DB query failed', { sql: 'SELECT * FROM users' }, false);
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        // Response is sanitized
        const jsonCall = res.json.mock.calls[0][0];
        (0, vitest_1.expect)(jsonCall.message).toBe('Internal server error');
        (0, vitest_1.expect)(jsonCall.details).toBeUndefined();
        // But log contains original details
        (0, vitest_1.expect)(logger_1.logger.error).toHaveBeenCalledWith('Internal server error', vitest_1.expect.objectContaining({
            originalMessage: 'DB query failed',
            details: { sql: 'SELECT * FROM users' },
        }));
        vitest_1.vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
    });
    (0, vitest_1.it)('should include err.cause in logs when present', () => {
        const req = mockRequest();
        const res = mockResponse();
        const cause = new Error('Root cause');
        const error = Object.assign(new Error('Wrapped error'), { cause });
        (0, error_middleware_1.errorMiddleware)(error, req, res, mockNext);
        (0, vitest_1.expect)(logger_1.logger.error).toHaveBeenCalledWith('Internal server error', vitest_1.expect.objectContaining({
            cause: vitest_1.expect.any(Error),
        }));
    });
});
(0, vitest_1.describe)('notFoundMiddleware', () => {
    (0, vitest_1.it)('should return 404 with route info', () => {
        const req = mockRequest({ method: 'GET', originalUrl: '/missing' });
        const res = mockResponse();
        (0, notFound_middleware_1.notFoundMiddleware)(req, res);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.NOT_FOUND);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Route GET /missing not found',
            requestId: 'req-test-123',
        });
    });
    (0, vitest_1.it)('should log 404s with structured context', () => {
        const req = mockRequest({
            method: 'POST',
            originalUrl: '/api/v1/unknown',
            path: '/api/v1/unknown',
            user: { id: 'user-99', email: 'a@example.com', role: 'member' },
        });
        const res = mockResponse();
        (0, notFound_middleware_1.notFoundMiddleware)(req, res);
        (0, vitest_1.expect)(logger_1.logger.warn).toHaveBeenCalledWith('Route POST /api/v1/unknown not found', vitest_1.expect.objectContaining({
            method: 'POST',
            url: '/api/v1/unknown',
            path: '/api/v1/unknown',
            requestId: 'req-test-123',
            ip: '127.0.0.1',
            userId: 'user-99',
        }));
    });
});
(0, vitest_1.describe)('requestIdMiddleware', () => {
    (0, vitest_1.it)('should set requestId from header if present', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = 'client-id-abc';
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).toBe('client-id-abc');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-id-abc');
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should generate requestId if header missing', () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).toBeDefined();
        (0, vitest_1.expect)(typeof req.requestId).toBe('string');
        (0, vitest_1.expect)(req.requestId).not.toBe('req-test-123');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-Request-Id', vitest_1.expect.any(String));
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should trim whitespace from client requestId', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = '  spaced-id  ';
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).toBe('spaced-id');
    });
    (0, vitest_1.it)('should use first value when multiple requestIds are sent', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = 'first-id, second-id';
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).toBe('first-id');
    });
    (0, vitest_1.it)('should generate new UUID for overly long requestId', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = 'a'.repeat(300);
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).not.toBe('a'.repeat(300));
        (0, vitest_1.expect)(typeof req.requestId).toBe('string');
    });
    (0, vitest_1.it)('should generate new UUID for requestId with invalid characters', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = 'id<script>alert(1)</script>';
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).not.toContain('<script>');
        (0, vitest_1.expect)(typeof req.requestId).toBe('string');
    });
    (0, vitest_1.it)('should generate new UUID for empty string requestId', () => {
        const req = mockRequest();
        req.headers['x-request-id'] = '';
        req.get = vitest_1.vi.fn((name) => req.headers[name.toLowerCase()]);
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, requestId_middleware_1.requestIdMiddleware)(req, res, next);
        (0, vitest_1.expect)(req.requestId).toBeDefined();
        (0, vitest_1.expect)(req.requestId).not.toBe('');
    });
});
(0, vitest_1.describe)('roleMiddleware', () => {
    (0, vitest_1.it)('should allow access when user has required role', () => {
        const req = mockRequest({
            user: { id: 'user-1', email: 'a@example.com', role: 'admin' },
        });
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, role_middleware_1.roleMiddleware)('admin', 'owner')(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
    (0, vitest_1.it)('should deny access when user role is not in allowed list', () => {
        const req = mockRequest({
            user: { id: 'user-2', email: 'b@example.com', role: 'member' },
        });
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, role_middleware_1.roleMiddleware)('admin')(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(error.statusCode).toBe(403);
        (0, vitest_1.expect)(error.details).toEqual({ requiredRoles: ['admin'], actualRole: 'member' });
        (0, vitest_1.expect)(logger_1.logger.warn).toHaveBeenCalledWith('Access denied: insufficient role', vitest_1.expect.objectContaining({
            userId: 'user-2',
            actualRole: 'member',
            requiredRoles: ['admin'],
        }));
    });
    (0, vitest_1.it)('should deny access when user is not authenticated', () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, role_middleware_1.roleMiddleware)('admin')(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        (0, vitest_1.expect)(error).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(error.statusCode).toBe(403);
        (0, vitest_1.expect)(error.details).toEqual({ requiredRoles: ['admin'], actualRole: undefined });
    });
    (0, vitest_1.it)('should allow access when user has any of the allowed roles', () => {
        const req = mockRequest({
            user: { id: 'user-3', email: 'c@example.com', role: 'manager' },
        });
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        (0, role_middleware_1.roleMiddleware)('admin', 'manager', 'owner')(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledWith();
    });
});
//# sourceMappingURL=error.middleware.test.js.map