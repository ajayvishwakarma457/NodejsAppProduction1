"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const constants_1 = require("../utils/constants");
const DEFAULT_PREFIX = `${env_1.env.APP_NAME}:`;
const JSON_PREFIX = '__json__:';
const buildKey = (key, namespace) => {
    if (namespace) {
        return `${DEFAULT_PREFIX}${namespace}:${key}`;
    }
    return `${DEFAULT_PREFIX}${key}`;
};
const serializeValue = (value) => {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number')
        return String(value);
    return `${JSON_PREFIX}${JSON.stringify(value)}`;
};
const deserializeValue = (raw) => {
    if (raw.startsWith(JSON_PREFIX)) {
        return JSON.parse(raw.slice(JSON_PREFIX.length));
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
        return Number(raw);
    }
    return raw;
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
    /* ------------------------------------------------------------------ */
    // Hashes
    /* ------------------------------------------------------------------ */
    /**
     * Set a single hash field. Optionally set TTL on the hash key.
     */
    async hSet(key, field, value, ttlSeconds, namespace) {
        return safeExec('hSet', async () => {
            const fullKey = buildKey(key, namespace);
            const count = await redis_1.redisClient.hSet(fullKey, field, serializeValue(value));
            if (ttlSeconds !== undefined) {
                await redis_1.redisClient.expire(fullKey, ttlSeconds);
            }
            return count === 0 || count === 1;
        }, false);
    },
    /**
     * Set multiple hash fields from an object. Optionally set TTL on the hash key.
     */
    async hSetMultiple(key, fields, ttlSeconds, namespace) {
        return safeExec('hSetMultiple', async () => {
            const fullKey = buildKey(key, namespace);
            const serialized = {};
            for (const [field, value] of Object.entries(fields)) {
                serialized[field] = serializeValue(value);
            }
            const count = await redis_1.redisClient.hSet(fullKey, serialized);
            if (ttlSeconds !== undefined) {
                await redis_1.redisClient.expire(fullKey, ttlSeconds);
            }
            return count >= 0;
        }, false);
    },
    /**
     * Get a single hash field.
     */
    async hGet(key, field, namespace) {
        return safeExec('hGet', async () => {
            const fullKey = buildKey(key, namespace);
            const raw = await redis_1.redisClient.hGet(fullKey, field);
            if (raw === undefined)
                return null;
            return deserializeValue(raw);
        }, null);
    },
    /**
     * Get all fields from a hash.
     */
    async hGetAll(key, namespace) {
        return safeExec('hGetAll', async () => {
            const fullKey = buildKey(key, namespace);
            const raw = await redis_1.redisClient.hGetAll(fullKey);
            if (Object.keys(raw).length === 0)
                return null;
            const result = {};
            for (const [field, value] of Object.entries(raw)) {
                result[field] = deserializeValue(value);
            }
            return result;
        }, null);
    },
    /**
     * Delete one or more fields from a hash.
     */
    async hDel(key, fields, namespace) {
        return safeExec('hDel', async () => {
            const fullKey = buildKey(key, namespace);
            const fieldArray = Array.isArray(fields) ? fields : [fields];
            return redis_1.redisClient.hDel(fullKey, fieldArray);
        }, 0);
    },
    /**
     * Check whether a hash field exists.
     */
    async hExists(key, field, namespace) {
        return safeExec('hExists', async () => redis_1.redisClient.hExists(buildKey(key, namespace), field), false);
    },
    /**
     * Increment a hash field by a given amount.
     */
    async hIncrBy(key, field, amount = 1, namespace) {
        return safeExec('hIncrBy', async () => redis_1.redisClient.hIncrBy(buildKey(key, namespace), field, amount), 0);
    },
    /**
     * Get all field names of a hash.
     */
    async hKeys(key, namespace) {
        return safeExec('hKeys', async () => redis_1.redisClient.hKeys(buildKey(key, namespace)), []);
    },
    /**
     * Get the number of fields in a hash.
     */
    async hLen(key, namespace) {
        return safeExec('hLen', async () => redis_1.redisClient.hLen(buildKey(key, namespace)), 0);
    },
    /* ------------------------------------------------------------------ */
    // Sorted Sets
    /* ------------------------------------------------------------------ */
    /**
     * Add members with scores to a sorted set. Optionally set TTL on the key.
     */
    async zAdd(key, members, ttlSeconds, namespace) {
        return safeExec('zAdd', async () => {
            const fullKey = buildKey(key, namespace);
            const count = await redis_1.redisClient.zAdd(fullKey, members);
            if (ttlSeconds !== undefined) {
                await redis_1.redisClient.expire(fullKey, ttlSeconds);
            }
            return count;
        }, 0);
    },
    /**
     * Add members with scores to a sorted set, serializing non-string values.
     */
    async zAddJSON(key, members, ttlSeconds, namespace) {
        return this.zAdd(key, members.map((m) => ({ score: m.score, value: serializeValue(m.value) })), ttlSeconds, namespace);
    },
    /**
     * Remove one or more members from a sorted set.
     */
    async zRem(key, members, namespace) {
        return safeExec('zRem', async () => {
            const fullKey = buildKey(key, namespace);
            const memberArray = Array.isArray(members) ? members : [members];
            return redis_1.redisClient.zRem(fullKey, memberArray);
        }, 0);
    },
    /**
     * Get the score of a member in a sorted set.
     */
    async zScore(key, member, namespace) {
        return safeExec('zScore', async () => redis_1.redisClient.zScore(buildKey(key, namespace), member), null);
    },
    /**
     * Get the number of members in a sorted set.
     */
    async zCard(key, namespace) {
        return safeExec('zCard', async () => redis_1.redisClient.zCard(buildKey(key, namespace)), 0);
    },
    /**
     * Count members with scores between min and max (inclusive).
     */
    async zCount(key, min = '-inf', max = '+inf', namespace) {
        return safeExec('zCount', async () => redis_1.redisClient.zCount(buildKey(key, namespace), min, max), 0);
    },
    /**
     * Return members in a rank range (0-based, ascending by score).
     */
    async zRange(key, start, stop, namespace) {
        return safeExec('zRange', async () => redis_1.redisClient.zRange(buildKey(key, namespace), start, stop), []);
    },
    /**
     * Return members with scores in a rank range.
     */
    async zRangeWithScores(key, start, stop, namespace) {
        return safeExec('zRangeWithScores', async () => redis_1.redisClient.zRangeWithScores(buildKey(key, namespace), start, stop), []);
    },
    /**
     * Return members in a rank range, reverse order (highest score first).
     */
    async zRevRange(key, start, stop, namespace) {
        return safeExec('zRevRange', async () => redis_1.redisClient.zRange(buildKey(key, namespace), start, stop, { REV: true }), []);
    },
    /**
     * Return members with scores in a rank range, reverse order.
     */
    async zRevRangeWithScores(key, start, stop, namespace) {
        return safeExec('zRevRangeWithScores', async () => redis_1.redisClient.zRangeWithScores(buildKey(key, namespace), start, stop, { REV: true }), []);
    },
    /**
     * Parse JSON-serialized members from zRange.
     */
    async zRangeJSON(key, start, stop, namespace) {
        const members = await this.zRange(key, start, stop, namespace);
        return members.map((m) => deserializeValue(m));
    },
    /**
     * Parse JSON-serialized members from zRevRange.
     */
    async zRevRangeJSON(key, start, stop, namespace) {
        const members = await this.zRevRange(key, start, stop, namespace);
        return members.map((m) => deserializeValue(m));
    },
    /**
     * Parse JSON-serialized members from zRangeWithScores.
     */
    async zRangeWithScoresJSON(key, start, stop, namespace) {
        const members = await this.zRangeWithScores(key, start, stop, namespace);
        return members.map((m) => ({ score: m.score, value: deserializeValue(m.value) }));
    },
    /**
     * Get the rank (0-based index) of a member in ascending order.
     */
    async zRank(key, member, namespace) {
        return safeExec('zRank', async () => redis_1.redisClient.zRank(buildKey(key, namespace), member), null);
    },
    /**
     * Get the rank of a member in descending order.
     */
    async zRevRank(key, member, namespace) {
        return safeExec('zRevRank', async () => redis_1.redisClient.zRevRank(buildKey(key, namespace), member), null);
    },
    /**
     * Increment the score of a member by a given amount.
     */
    async zIncrBy(key, member, amount = 1, namespace) {
        return safeExec('zIncrBy', async () => redis_1.redisClient.zIncrBy(buildKey(key, namespace), amount, member), 0);
    },
    /**
     * Remove members with scores between min and max (inclusive).
     * Useful for sliding-window cleanups.
     */
    async zRemRangeByScore(key, min, max, namespace) {
        return safeExec('zRemRangeByScore', async () => redis_1.redisClient.zRemRangeByScore(buildKey(key, namespace), min, max), 0);
    },
    /* ------------------------------------------------------------------ */
    // TTL helpers
    /* ------------------------------------------------------------------ */
    /**
     * Get the remaining TTL (seconds) for a key. Returns -1 if no expiry, -2 if missing.
     */
    async ttl(key, namespace) {
        return safeExec('ttl', async () => redis_1.redisClient.ttl(buildKey(key, namespace)), -2);
    },
    /**
     * Remove the expiration from a key.
     */
    async persist(key, namespace) {
        return safeExec('persist', async () => redis_1.redisClient.persist(buildKey(key, namespace)), false);
    },
};
//# sourceMappingURL=redis.service.js.map