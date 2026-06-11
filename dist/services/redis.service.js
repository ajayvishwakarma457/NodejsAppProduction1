"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const constants_1 = require("../utils/constants");
const DEFAULT_PREFIX = `${env_1.env.APP_NAME}:`;
const buildKey = (key, namespace) => {
    if (namespace) {
        return `${DEFAULT_PREFIX}${namespace}:${key}`;
    }
    return `${DEFAULT_PREFIX}${key}`;
};
const safeExec = async (operation, fn, fallback) => {
    try {
        return await fn();
    }
    catch (error) {
        logger_1.logger.error(`Redis operation failed: ${operation}`, {
            error: error instanceof Error ? error.message : error,
        });
        return fallback;
    }
};
exports.redisService = {
    /** Raw Redis client for advanced use-cases. */
    get client() {
        return redis_1.redisClient;
    },
    /** Connect to Redis. */
    async connect() {
        if (!redis_1.redisClient.isOpen) {
            await redis_1.redisClient.connect();
        }
    },
    /** Disconnect from Redis. */
    async disconnect() {
        if (redis_1.redisClient.isOpen) {
            await redis_1.redisClient.disconnect();
        }
    },
    /** Check Redis connectivity. */
    async health() {
        return safeExec('health', async () => {
            const pong = await redis_1.redisClient.ping();
            return pong === 'PONG';
        }, false);
    },
    /** Set a string value with optional TTL (seconds). */
    async set(key, value, ttlSeconds = constants_1.CACHE_TTL.medium, namespace) {
        return safeExec('set', async () => {
            const fullKey = buildKey(key, namespace);
            await redis_1.redisClient.setEx(fullKey, ttlSeconds, value);
            return true;
        }, false);
    },
    /** Get a string value. */
    async get(key, namespace) {
        return safeExec('get', async () => {
            const fullKey = buildKey(key, namespace);
            return redis_1.redisClient.get(fullKey);
        }, null);
    },
    /** Delete one or more keys. */
    async del(key, namespace) {
        return safeExec('del', async () => {
            const keys = Array.isArray(key) ? key : [key];
            const fullKeys = keys.map((k) => buildKey(k, namespace));
            return redis_1.redisClient.del(fullKeys);
        }, 0);
    },
    /** Set a JSON value with optional TTL (seconds). */
    async setJSON(key, value, ttlSeconds = constants_1.CACHE_TTL.medium, namespace) {
        return this.set(key, JSON.stringify(value), ttlSeconds, namespace);
    },
    /** Get and parse a JSON value. */
    async getJSON(key, namespace) {
        const raw = await this.get(key, namespace);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch (error) {
            logger_1.logger.error('Redis JSON parse failed', { key, error });
            return null;
        }
    },
    /** Cache-aside pattern: fetch from cache or set via factory. */
    async getOrSet(key, factory, ttlSeconds = constants_1.CACHE_TTL.medium, namespace) {
        const cached = await this.getJSON(key, namespace);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        if (value !== null && value !== undefined) {
            await this.setJSON(key, value, ttlSeconds, namespace);
        }
        return value ?? null;
    },
    /** Check if a key exists. */
    async exists(key, namespace) {
        const count = await safeExec('exists', async () => redis_1.redisClient.exists(buildKey(key, namespace)), 0);
        return count > 0;
    },
    /** Set expiration (seconds) on an existing key. */
    async expire(key, ttlSeconds, namespace) {
        const result = await safeExec('expire', async () => redis_1.redisClient.expire(buildKey(key, namespace), ttlSeconds), false);
        return result;
    },
    /** Increment a key by a given amount. */
    async incrBy(key, amount = 1, namespace) {
        return safeExec('incrBy', async () => redis_1.redisClient.incrBy(buildKey(key, namespace), amount), 0);
    },
    /** Decrement a key by a given amount. */
    async decrBy(key, amount = 1, namespace) {
        return safeExec('decrBy', async () => redis_1.redisClient.decrBy(buildKey(key, namespace), amount), 0);
    },
    /** Delete keys matching a pattern (uses SCAN to avoid blocking). */
    async deletePattern(pattern, namespace) {
        return safeExec('deletePattern', async () => {
            const fullPattern = buildKey(pattern, namespace);
            let cursor = 0;
            let deleted = 0;
            do {
                const result = await redis_1.redisClient.scan(cursor, {
                    MATCH: fullPattern,
                    COUNT: 100,
                });
                cursor = result.cursor;
                if (result.keys.length > 0) {
                    await redis_1.redisClient.del(result.keys);
                    deleted += result.keys.length;
                }
            } while (cursor !== 0);
            return deleted;
        }, 0);
    },
    /** Acquire a distributed lock (simple SET NX EX pattern). */
    async lock(lockKey, ttlSeconds = 30, namespace) {
        const fullKey = buildKey(`lock:${lockKey}`, namespace);
        const token = `${Date.now()}-${Math.random()}`;
        const acquired = await safeExec('lock', async () => {
            const result = await redis_1.redisClient.set(fullKey, token, {
                NX: true,
                EX: ttlSeconds,
            });
            return result === 'OK';
        }, false);
        if (!acquired)
            return null;
        return {
            release: async () => {
                await safeExec('releaseLock', async () => {
                    const current = await redis_1.redisClient.get(fullKey);
                    if (current === token) {
                        await redis_1.redisClient.del(fullKey);
                    }
                }, undefined);
            },
        };
    },
};
//# sourceMappingURL=redis.service.js.map