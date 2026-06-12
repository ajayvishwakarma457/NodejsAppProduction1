"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheAside = exports.CACHE_NAMESPACE = void 0;
const redis_service_1 = require("../services/redis.service");
const constants_1 = require("./constants");
/* ------------------------------------------------------------------ */
// Namespaces
/* ------------------------------------------------------------------ */
exports.CACHE_NAMESPACE = {
    users: 'users',
    teams: 'teams',
    projects: 'projects',
    tasks: 'tasks',
};
/* ------------------------------------------------------------------ */
// Cache-aside helpers
/* ------------------------------------------------------------------ */
/**
 * Production-grade cache-aside helper.
 *
 * - Reads from Redis first.
 * - Falls back to the factory on miss and stores the result.
 * - Serializes/deserializes JSON automatically.
 * - Isolated per namespace for predictable invalidation.
 *
 * The key is scoped to the namespace automatically by redisService,
 * so callers should pass a plain key such as the entity id or a
 * list descriptor (e.g. `list:<hash>:p1:l10`).
 */
exports.cacheAside = {
    async getOrSet(namespace, key, factory, ttlSeconds = constants_1.CACHE_TTL.medium) {
        return redis_service_1.redisService.getOrSet(key, factory, ttlSeconds, namespace);
    },
    async invalidate(namespace, key) {
        await redis_service_1.redisService.del(key, namespace);
    },
    async invalidatePattern(namespace, pattern) {
        await redis_service_1.redisService.deletePattern(pattern, namespace);
    },
    /**
     * Invalidate a single entity plus any list caches in the namespace.
     * Use this after creates/updates/deletes to keep list responses fresh.
     */
    async invalidateEntity(namespace, id) {
        await Promise.all([
            this.invalidate(namespace, id),
            this.invalidatePattern(namespace, 'list:*'),
        ]);
    },
};
//# sourceMappingURL=cache.js.map