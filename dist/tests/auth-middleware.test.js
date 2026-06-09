"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_middleware_1 = require("../middleware/auth.middleware");
const token_service_1 = require("../services/token.service");
const redis_service_1 = require("../services/redis.service");
const ApiError_1 = require("../utils/ApiError");
const mockRequest = (headers = {}) => ({
    headers,
    user: undefined
});
const mockResponse = () => ({
    status: () => mockResponse(),
    json: () => mockResponse()
});
const mockNext = () => {
    const calls = [];
    const fn = (arg) => {
        calls.push(arg);
    };
    fn.calls = calls;
    return fn;
};
(0, vitest_1.describe)("authMiddleware", () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)("should reject request without Authorization header", async () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(next.calls[0].statusCode).toBe(401);
    });
    (0, vitest_1.it)("should reject request with malformed Authorization header", async () => {
        const req = mockRequest({ authorization: "Basic abc123" });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(next.calls[0].statusCode).toBe(401);
    });
    (0, vitest_1.it)("should reject invalid token", async () => {
        const req = mockRequest({ authorization: "Bearer invalid-token" });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(next.calls[0].statusCode).toBe(401);
    });
    (0, vitest_1.it)("should reject blacklisted token", async () => {
        const token = token_service_1.tokenService.generateAccessToken("user-1", "a@example.com", "member");
        await token_service_1.tokenService.blacklistAccessToken(token);
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeInstanceOf(ApiError_1.ApiError);
        (0, vitest_1.expect)(next.calls[0].message).toContain("revoked");
    });
    (0, vitest_1.it)("should allow valid token and attach user", async () => {
        const token = token_service_1.tokenService.generateAccessToken("user-1", "a@example.com", "admin");
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.authMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeUndefined();
        (0, vitest_1.expect)(req.user).toEqual({
            id: "user-1",
            email: "a@example.com",
            role: "admin"
        });
    });
});
(0, vitest_1.describe)("optionalAuthMiddleware", () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)("should continue without user when no token provided", async () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.optionalAuthMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeUndefined();
        (0, vitest_1.expect)(req.user).toBeUndefined();
    });
    (0, vitest_1.it)("should continue without user when token is invalid", async () => {
        const req = mockRequest({ authorization: "Bearer bad-token" });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.optionalAuthMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeUndefined();
        (0, vitest_1.expect)(req.user).toBeUndefined();
    });
    (0, vitest_1.it)("should attach user when valid token provided", async () => {
        const token = token_service_1.tokenService.generateAccessToken("user-2", "b@example.com", "member");
        const req = mockRequest({ authorization: `Bearer ${token}` });
        const res = mockResponse();
        const next = mockNext();
        await (0, auth_middleware_1.optionalAuthMiddleware)(req, res, next);
        (0, vitest_1.expect)(next.calls[0]).toBeUndefined();
        (0, vitest_1.expect)(req.user).toEqual({
            id: "user-2",
            email: "b@example.com",
            role: "member"
        });
    });
});
