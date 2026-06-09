"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
const redis_service_1 = require("./redis.service");
const ACCESS_SECRET = env_1.env.JWT_SECRET;
const REFRESH_SECRET = env_1.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = env_1.env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES = env_1.env.JWT_REFRESH_EXPIRES_IN;
const BLACKLIST_PREFIX = "token:blacklist:";
const REFRESH_PREFIX = "token:refresh:";
const toSeconds = (duration) => {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match)
        return 900; // default 15 min
    const [, value, unit] = match;
    const multiplier = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400
    };
    return parseInt(value, 10) * (multiplier[unit] ?? 60);
};
exports.tokenService = {
    /** Generate a signed access token. */
    generateAccessToken(userId, email, role) {
        const payload = {
            sub: userId,
            email,
            role,
            jti: (0, crypto_1.randomUUID)()
        };
        return jsonwebtoken_1.default.sign({ ...payload, type: "access" }, ACCESS_SECRET, {
            expiresIn: ACCESS_EXPIRES
        });
    },
    /** Generate a signed refresh token and store its jti in Redis. */
    async generateRefreshToken(userId, email, role) {
        const jti = (0, crypto_1.randomUUID)();
        const payload = {
            sub: userId,
            email,
            role,
            jti,
            type: "refresh"
        };
        const token = jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, {
            expiresIn: REFRESH_EXPIRES
        });
        const ttl = toSeconds(REFRESH_EXPIRES);
        await redis_service_1.redisService.set(`${REFRESH_PREFIX}${jti}`, userId, ttl);
        return token;
    },
    /** Generate both tokens as a pair. */
    async generateTokenPair(userId, email, role) {
        const accessToken = this.generateAccessToken(userId, email, role);
        const refreshToken = await this.generateRefreshToken(userId, email, role);
        const accessDecoded = jsonwebtoken_1.default.decode(accessToken);
        const refreshDecoded = jsonwebtoken_1.default.decode(refreshToken);
        return {
            accessToken,
            refreshToken,
            accessTokenExpiresAt: new Date((accessDecoded?.exp ?? 0) * 1000),
            refreshTokenExpiresAt: new Date((refreshDecoded?.exp ?? 0) * 1000)
        };
    },
    /** Verify an access token and return its payload. */
    verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, ACCESS_SECRET, {
                clockTolerance: 30
            });
            if (payload.type !== "access") {
                throw ApiError_1.ApiError.unauthorized("Invalid token type");
            }
            return payload;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw ApiError_1.ApiError.unauthorized("Access token expired");
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw ApiError_1.ApiError.unauthorized("Invalid access token");
            }
            throw ApiError_1.ApiError.unauthorized("Token verification failed");
        }
    },
    /** Verify a refresh token, check Redis storage, and return its payload. */
    async verifyRefreshToken(token) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, REFRESH_SECRET, {
                clockTolerance: 30
            });
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw ApiError_1.ApiError.unauthorized("Refresh token expired");
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw ApiError_1.ApiError.unauthorized("Invalid refresh token");
            }
            throw ApiError_1.ApiError.unauthorized("Token verification failed");
        }
        if (payload.type !== "refresh") {
            throw ApiError_1.ApiError.unauthorized("Invalid token type");
        }
        const stored = await redis_service_1.redisService.get(`${REFRESH_PREFIX}${payload.jti}`);
        if (!stored) {
            throw ApiError_1.ApiError.unauthorized("Refresh token revoked or expired");
        }
        return payload;
    },
    /** Decode a token without verifying (for inspection). */
    decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch {
            return null;
        }
    },
    /** Blacklist an access token (logout / force expire). */
    async blacklistAccessToken(token) {
        const payload = this.decodeToken(token);
        if (!payload?.jti || payload.type !== "access")
            return;
        const decoded = jsonwebtoken_1.default.decode(token);
        const ttl = decoded?.exp
            ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
            : toSeconds(ACCESS_EXPIRES);
        await redis_service_1.redisService.set(`${BLACKLIST_PREFIX}${payload.jti}`, "1", ttl);
        logger_1.logger.info("Access token blacklisted", { jti: payload.jti });
    },
    /** Check if an access token is blacklisted. */
    async isBlacklisted(token) {
        const payload = this.decodeToken(token);
        if (!payload?.jti)
            return false;
        const blacklisted = await redis_service_1.redisService.get(`${BLACKLIST_PREFIX}${payload.jti}`);
        return blacklisted === "1";
    },
    /** Revoke a refresh token by its jti. */
    async revokeRefreshToken(jti) {
        await redis_service_1.redisService.del(`${REFRESH_PREFIX}${jti}`);
        logger_1.logger.info("Refresh token revoked", { jti });
    },
    /** Revoke all refresh tokens for a user (change password / security breach). */
    async revokeAllUserRefreshTokens(userId) {
        // Note: In a full implementation, maintain a user-specific refresh token index in Redis.
        // This stub logs the intent; extend with a Redis set per user when scaling.
        logger_1.logger.warn("Revoke all refresh tokens for user", { userId });
    },
    /** Rotate refresh token: verify old, revoke it, issue new pair. */
    async rotateRefreshToken(refreshToken) {
        const payload = await this.verifyRefreshToken(refreshToken);
        await this.revokeRefreshToken(payload.jti);
        return this.generateTokenPair(payload.sub, payload.email, payload.role);
    }
};
