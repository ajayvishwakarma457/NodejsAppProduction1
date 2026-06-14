"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const token_service_1 = require("../../services/token.service");
const redis_service_1 = require("../../services/redis.service");
const ApiError_1 = require("../../utils/ApiError");
(0, vitest_1.describe)('tokenService', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should generate a valid access token', () => {
        const token = token_service_1.tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
        (0, vitest_1.expect)(typeof token).toBe('string');
        (0, vitest_1.expect)(token.split('.')).toHaveLength(3);
    });
    (0, vitest_1.it)('should verify a valid access token', () => {
        const token = token_service_1.tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        (0, vitest_1.expect)(payload.sub).toBe('user-1');
        (0, vitest_1.expect)(payload.email).toBe('a@example.com');
        (0, vitest_1.expect)(payload.role).toBe('admin');
        (0, vitest_1.expect)(payload.type).toBe('access');
        (0, vitest_1.expect)(payload.jti).toBeDefined();
    });
    (0, vitest_1.it)('should reject an invalid access token', () => {
        (0, vitest_1.expect)(() => token_service_1.tokenService.verifyAccessToken('bad-token')).toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)('should generate and verify a refresh token', async () => {
        const token = await token_service_1.tokenService.generateRefreshToken('user-1', 'a@example.com', 'admin');
        const payload = await token_service_1.tokenService.verifyRefreshToken(token);
        (0, vitest_1.expect)(payload.sub).toBe('user-1');
        (0, vitest_1.expect)(payload.type).toBe('refresh');
    });
    (0, vitest_1.it)('should reject a revoked refresh token', async () => {
        const token = await token_service_1.tokenService.generateRefreshToken('user-1', 'a@example.com', 'admin');
        const payload = await token_service_1.tokenService.verifyRefreshToken(token);
        await token_service_1.tokenService.revokeRefreshToken(payload.jti);
        await (0, vitest_1.expect)(token_service_1.tokenService.verifyRefreshToken(token)).rejects.toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)('should generate a token pair', async () => {
        const pair = await token_service_1.tokenService.generateTokenPair('user-1', 'a@example.com', 'member');
        (0, vitest_1.expect)(pair.accessToken).toBeDefined();
        (0, vitest_1.expect)(pair.refreshToken).toBeDefined();
        (0, vitest_1.expect)(pair.accessTokenExpiresAt instanceof Date).toBe(true);
        (0, vitest_1.expect)(pair.refreshTokenExpiresAt instanceof Date).toBe(true);
    });
    (0, vitest_1.it)('should blacklist an access token', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
        (0, vitest_1.expect)(await token_service_1.tokenService.isBlacklisted(token)).toBe(false);
        await token_service_1.tokenService.blacklistAccessToken(token);
        (0, vitest_1.expect)(await token_service_1.tokenService.isBlacklisted(token)).toBe(true);
    });
    (0, vitest_1.it)('should rotate refresh tokens', async () => {
        const pair = await token_service_1.tokenService.generateTokenPair('user-1', 'a@example.com', 'member');
        const newPair = await token_service_1.tokenService.rotateRefreshToken(pair.refreshToken);
        (0, vitest_1.expect)(newPair.accessToken).toBeDefined();
        (0, vitest_1.expect)(newPair.refreshToken).toBeDefined();
        // Old refresh token should be revoked
        await (0, vitest_1.expect)(token_service_1.tokenService.verifyRefreshToken(pair.refreshToken)).rejects.toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)('should decode a token without verifying', () => {
        const token = token_service_1.tokenService.generateAccessToken('user-1', 'a@example.com', 'admin');
        const decoded = token_service_1.tokenService.decodeToken(token);
        (0, vitest_1.expect)(decoded?.sub).toBe('user-1');
        (0, vitest_1.expect)(decoded?.type).toBe('access');
    });
});
//# sourceMappingURL=token.test.js.map