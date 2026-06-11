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
const rateLimit_middleware_1 = require("../../middleware/rateLimit.middleware");
const envModule = __importStar(require("../../config/env"));
const mockRequest = (overrides = {}) => {
    return {
        method: 'GET',
        originalUrl: '/api/v1/test',
        url: '/api/v1/test',
        path: '/api/v1/test',
        ip: '127.0.0.1',
        headers: {},
        body: {},
        user: undefined,
        requestId: 'req-test-456',
        get: vitest_1.vi.fn(),
        ...overrides,
    };
};
const mockResponse = () => {
    const headers = {};
    const res = {
        statusCode: 200,
        headersSent: false,
        setHeader: vitest_1.vi.fn((name, value) => {
            headers[name] = value;
            return res;
        }),
        getHeader: vitest_1.vi.fn((name) => headers[name]),
        status: vitest_1.vi.fn().mockReturnThis(),
        json: vitest_1.vi.fn().mockReturnThis(),
    };
    return res;
};
vitest_1.vi.mock('../../config/logger', () => ({
    logger: {
        error: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        info: vitest_1.vi.fn(),
        debug: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../../config/redis', () => ({
    redisClient: {
        incr: vitest_1.vi.fn(),
        expire: vitest_1.vi.fn(),
        ttl: vitest_1.vi.fn(),
    },
}));
const logger_1 = require("../../config/logger");
const redis_1 = require("../../config/redis");
(0, vitest_1.describe)('rateLimitMiddleware', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should skip when rate limiting is disabled', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(false);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        (0, vitest_1.expect)(redis_1.redisClient.incr).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should skip health endpoint', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        const req = mockRequest({ path: '/health', originalUrl: '/health', url: '/health' });
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        (0, vitest_1.expect)(redis_1.redisClient.incr).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should allow request when under limit for anonymous users', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        vitest_1.vi.spyOn(envModule.env, 'APP_NAME', 'get').mockReturnValue('TestApp');
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_WINDOW_MS', 'get').mockReturnValue(60000);
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);
        redis_1.redisClient.incr.mockResolvedValue(1);
        redis_1.redisClient.expire.mockResolvedValue(true);
        redis_1.redisClient.ttl.mockResolvedValue(60);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(redis_1.redisClient.incr).toHaveBeenCalledWith('TestApp:ratelimit:ip:127.0.0.1');
        (0, vitest_1.expect)(redis_1.redisClient.expire).toHaveBeenCalledWith('TestApp:ratelimit:ip:127.0.0.1', 60);
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should allow request when under limit for authenticated users', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        vitest_1.vi.spyOn(envModule.env, 'APP_NAME', 'get').mockReturnValue('TestApp');
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS', 'get').mockReturnValue(10);
        redis_1.redisClient.incr.mockResolvedValue(3);
        redis_1.redisClient.ttl.mockResolvedValue(45);
        const req = mockRequest({ user: { id: 'user-1', email: 'a@example.com', role: 'member' } });
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(redis_1.redisClient.incr).toHaveBeenCalledWith('TestApp:ratelimit:user:user-1');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '7');
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should block request when over limit and return 429', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);
        redis_1.redisClient.incr.mockResolvedValue(6);
        redis_1.redisClient.ttl.mockResolvedValue(30);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS);
        (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            success: false,
            message: 'Too many requests, please try again later',
        }));
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
        (0, vitest_1.expect)(logger_1.logger.warn).toHaveBeenCalledWith('Rate limit exceeded', vitest_1.expect.objectContaining({
            identifier: '127.0.0.1',
            type: 'ip',
            count: 6,
        }));
    });
    (0, vitest_1.it)('should set X-RateLimit-Reset header', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        redis_1.redisClient.incr.mockResolvedValue(2);
        redis_1.redisClient.ttl.mockResolvedValue(55);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        const before = Math.ceil(Date.now() / 1000);
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', vitest_1.expect.any(String));
        const resetCall = res.setHeader.mock.calls.find((call) => call[0] === 'X-RateLimit-Reset');
        const resetValue = parseInt(resetCall[1], 10);
        const after = Math.ceil(Date.now() / 1000) + 60;
        (0, vitest_1.expect)(resetValue).toBeGreaterThanOrEqual(before + 55);
        (0, vitest_1.expect)(resetValue).toBeLessThanOrEqual(after);
    });
    (0, vitest_1.it)('should set draft-7 RateLimit headers', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);
        redis_1.redisClient.incr.mockResolvedValue(3);
        redis_1.redisClient.ttl.mockResolvedValue(45);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '5');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '2');
        (0, vitest_1.expect)(res.setHeader).toHaveBeenCalledWith('RateLimit-Reset', vitest_1.expect.any(String));
    });
    (0, vitest_1.it)('should fail open when Redis is unavailable', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        redis_1.redisClient.incr.mockRejectedValue(new Error('Redis connection lost'));
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        (0, vitest_1.expect)(logger_1.logger.warn).toHaveBeenCalledWith('Rate limiting check failed, allowing request', vitest_1.expect.objectContaining({ error: 'Redis connection lost' }));
    });
    (0, vitest_1.it)('should not call expire after the first increment on subsequent requests', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        redis_1.redisClient.incr.mockResolvedValue(2);
        redis_1.redisClient.ttl.mockResolvedValue(50);
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(redis_1.redisClient.expire).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should fallback to window seconds when TTL read fails', async () => {
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
        vitest_1.vi.spyOn(envModule.env, 'RATE_LIMIT_WINDOW_MS', 'get').mockReturnValue(60000);
        redis_1.redisClient.incr.mockResolvedValue(1);
        redis_1.redisClient.expire.mockResolvedValue(true);
        redis_1.redisClient.ttl.mockRejectedValue(new Error('TTL error'));
        const req = mockRequest();
        const res = mockResponse();
        const next = vitest_1.vi.fn();
        await (0, rateLimit_middleware_1.rateLimitMiddleware)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
        const resetCall = res.setHeader.mock.calls.find((call) => call[0] === 'X-RateLimit-Reset');
        const resetValue = parseInt(resetCall[1], 10);
        (0, vitest_1.expect)(resetValue).toBeGreaterThan(Math.ceil(Date.now() / 1000));
    });
});
//# sourceMappingURL=rateLimit.middleware.test.js.map