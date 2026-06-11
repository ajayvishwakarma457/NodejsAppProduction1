"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const redis_1 = require("redis");
const logger_1 = require("./logger");
const env_1 = require("./env");
const sanitizeUrl = (url) => {
    try {
        const parsed = new URL(url);
        if (parsed.password) {
            parsed.password = '****';
        }
        return parsed.toString();
    }
    catch {
        return url;
    }
};
exports.redisClient = (0, redis_1.createClient)({
    url: env_1.env.REDIS_URL,
    socket: {
        connectTimeout: 10000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
            const delay = Math.min(retries * 100, 3000);
            logger_1.logger.warn('Redis reconnecting...', { retries, delay });
            return delay;
        },
    },
    pingInterval: 30000,
});
exports.redisClient.on('error', (err) => {
    logger_1.logger.error('Redis client error', { error: err.message });
});
exports.redisClient.on('connect', () => {
    logger_1.logger.info('Redis client connecting', { url: sanitizeUrl(env_1.env.REDIS_URL) });
});
exports.redisClient.on('ready', () => {
    logger_1.logger.info('Redis client ready');
});
exports.redisClient.on('reconnecting', () => {
    logger_1.logger.warn('Redis client reconnecting');
});
exports.redisClient.on('end', () => {
    logger_1.logger.info('Redis client connection closed');
});
//# sourceMappingURL=redis.js.map