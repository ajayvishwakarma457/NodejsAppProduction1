"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const getIdentifier = (req) => {
    if (req.user?.id) {
        return { type: "user", id: req.user.id };
    }
    return { type: "ip", id: req.ip || "unknown" };
};
const rateLimitMiddleware = async (req, res, next) => {
    if (!env_1.env.RATE_LIMIT_ENABLED || req.path === "/health") {
        return next();
    }
    const prefix = `${env_1.env.APP_NAME}:ratelimit`;
    const windowSeconds = Math.ceil(env_1.env.RATE_LIMIT_WINDOW_MS / 1000);
    const { type, id } = getIdentifier(req);
    const key = `${prefix}:${type}:${id}`;
    const maxRequests = type === "user"
        ? env_1.env.RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS
        : env_1.env.RATE_LIMIT_MAX_REQUESTS;
    try {
        const current = await redis_1.redisClient.incr(key);
        if (current === 1) {
            await redis_1.redisClient.expire(key, windowSeconds);
        }
        let ttl = windowSeconds;
        try {
            const redisTtl = await redis_1.redisClient.ttl(key);
            if (redisTtl > 0)
                ttl = redisTtl;
        }
        catch {
            /* ignore TTL read failures */
        }
        const resetTime = Math.ceil(Date.now() / 1000) + ttl;
        res.setHeader("X-RateLimit-Limit", String(maxRequests));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - current)));
        res.setHeader("X-RateLimit-Reset", String(resetTime));
        if (current > maxRequests) {
            logger_1.logger.warn("Rate limit exceeded", {
                method: req.method,
                url: req.originalUrl,
                requestId: req.requestId,
                identifier: id,
                type,
                count: current
            });
            return res.status(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS).json({
                success: false,
                message: "Too many requests, please try again later",
                requestId: req.requestId
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.warn("Rate limiting check failed, allowing request", {
            error: error instanceof Error ? error.message : error,
            requestId: req.requestId
        });
        next();
    }
};
exports.rateLimitMiddleware = rateLimitMiddleware;
