"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../../services/redis.service");
const cache_1 = require("../../utils/cache");
(0, vitest_1.describe)('cacheAside', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('returns cached value without calling factory on cache hit', async () => {
        const key = `cache-hit-${Date.now()}`;
        let calls = 0;
        const factory = async () => {
            calls++;
            return { id: key, name: 'Alice' };
        };
        const first = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, key, factory, 60);
        const second = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, key, factory, 60);
        (0, vitest_1.expect)(first).toEqual({ id: key, name: 'Alice' });
        (0, vitest_1.expect)(second).toEqual({ id: key, name: 'Alice' });
        (0, vitest_1.expect)(calls).toBe(1);
    });
    (0, vitest_1.it)('does not cache null or undefined values', async () => {
        const key = `cache-miss-${Date.now()}`;
        let calls = 0;
        const factory = async () => {
            calls++;
            return null;
        };
        const first = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, key, factory, 60);
        const second = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, key, factory, 60);
        (0, vitest_1.expect)(first).toBeNull();
        (0, vitest_1.expect)(second).toBeNull();
        (0, vitest_1.expect)(calls).toBe(2);
    });
    (0, vitest_1.it)('invalidates a single entity key', async () => {
        const key = `cache-invalidate-${Date.now()}`;
        const factory = async () => ({ id: key, cached: true });
        await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.teams, key, factory, 60);
        await cache_1.cacheAside.invalidate(cache_1.CACHE_NAMESPACE.teams, key);
        let calls = 0;
        const nextFactory = async () => {
            calls++;
            return { id: key, cached: false };
        };
        const result = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.teams, key, nextFactory, 60);
        (0, vitest_1.expect)(result).toEqual({ id: key, cached: false });
        (0, vitest_1.expect)(calls).toBe(1);
    });
    (0, vitest_1.it)('invalidates entity key and matching list keys', async () => {
        const entityKey = `entity-${Date.now()}`;
        const listKey = `list:filter:p1:l10`;
        await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.projects, entityKey, async () => ({ id: entityKey }), 60);
        await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.projects, listKey, async () => ({ items: [] }), 60);
        await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.projects, entityKey);
        let entityCalls = 0;
        let listCalls = 0;
        const entity = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.projects, entityKey, async () => {
            entityCalls++;
            return { id: entityKey, fresh: true };
        }, 60);
        const list = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.projects, listKey, async () => {
            listCalls++;
            return { items: [1] };
        }, 60);
        (0, vitest_1.expect)(entity).toEqual({ id: entityKey, fresh: true });
        (0, vitest_1.expect)(list).toEqual({ items: [1] });
        (0, vitest_1.expect)(entityCalls).toBe(1);
        (0, vitest_1.expect)(listCalls).toBe(1);
    });
    (0, vitest_1.it)('isolates namespaces from each other', async () => {
        const key = `namespace-isolation-${Date.now()}`;
        await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, key, async () => ({ source: 'users' }), 60);
        const tasksValue = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.tasks, key, async () => ({ source: 'tasks' }), 60);
        (0, vitest_1.expect)(tasksValue).toEqual({ source: 'tasks' });
    });
});
//# sourceMappingURL=cache.test.js.map