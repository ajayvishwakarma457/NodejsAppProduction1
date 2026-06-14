"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../../services/redis.service");
(0, vitest_1.describe)('redisService', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should pass health check', async () => {
        const healthy = await redis_service_1.redisService.health();
        (0, vitest_1.expect)(healthy).toBe(true);
    });
    (0, vitest_1.it)('should set and get a string value', async () => {
        await redis_service_1.redisService.set('test:key', 'hello', 60, 'test-ns');
        const value = await redis_service_1.redisService.get('test:key', 'test-ns');
        (0, vitest_1.expect)(value).toBe('hello');
    });
    (0, vitest_1.it)('should set and get JSON', async () => {
        const data = { id: 1, name: 'Alice' };
        await redis_service_1.redisService.setJSON('test:json', data, 60, 'test-ns');
        const result = await redis_service_1.redisService.getJSON('test:json', 'test-ns');
        (0, vitest_1.expect)(result).toEqual(data);
    });
    (0, vitest_1.it)('should return null for missing key', async () => {
        const value = await redis_service_1.redisService.get('test:missing', 'test-ns');
        (0, vitest_1.expect)(value).toBeNull();
    });
    (0, vitest_1.it)('should delete a key', async () => {
        await redis_service_1.redisService.set('test:del', 'bye', 60, 'test-ns');
        await redis_service_1.redisService.del('test:del', 'test-ns');
        const value = await redis_service_1.redisService.get('test:del', 'test-ns');
        (0, vitest_1.expect)(value).toBeNull();
    });
    (0, vitest_1.it)('should check key existence', async () => {
        await redis_service_1.redisService.set('test:exists', 'yes', 60, 'test-ns');
        (0, vitest_1.expect)(await redis_service_1.redisService.exists('test:exists', 'test-ns')).toBe(true);
        (0, vitest_1.expect)(await redis_service_1.redisService.exists('test:nope', 'test-ns')).toBe(false);
    });
    (0, vitest_1.it)('should increment and decrement', async () => {
        const key = 'test:counter';
        await redis_service_1.redisService.del(key, 'test-ns');
        const v1 = await redis_service_1.redisService.incrBy(key, 5, 'test-ns');
        (0, vitest_1.expect)(v1).toBe(5);
        const v2 = await redis_service_1.redisService.decrBy(key, 2, 'test-ns');
        (0, vitest_1.expect)(v2).toBe(3);
    });
    (0, vitest_1.it)('should support getOrSet pattern', async () => {
        await redis_service_1.redisService.del('test:lazy', 'test-ns');
        let calls = 0;
        const factory = async () => {
            calls++;
            return { data: 'computed' };
        };
        // First call computes
        const r1 = await redis_service_1.redisService.getOrSet('test:lazy', factory, 60, 'test-ns');
        (0, vitest_1.expect)(r1).toEqual({ data: 'computed' });
        (0, vitest_1.expect)(calls).toBe(1);
        // Second call returns cached
        const r2 = await redis_service_1.redisService.getOrSet('test:lazy', factory, 60, 'test-ns');
        (0, vitest_1.expect)(r2).toEqual({ data: 'computed' });
        (0, vitest_1.expect)(calls).toBe(1);
    });
    (0, vitest_1.it)('should acquire and release a lock', async () => {
        const lock = await redis_service_1.redisService.lock('test:resource', 10, 'test-ns');
        (0, vitest_1.expect)(lock).not.toBeNull();
        // Second acquire should fail
        const lock2 = await redis_service_1.redisService.lock('test:resource', 10, 'test-ns');
        (0, vitest_1.expect)(lock2).toBeNull();
        // Release and re-acquire
        await lock.release();
        const lock3 = await redis_service_1.redisService.lock('test:resource', 10, 'test-ns');
        (0, vitest_1.expect)(lock3).not.toBeNull();
        await lock3.release();
    });
    (0, vitest_1.it)('should delete keys by pattern', async () => {
        await redis_service_1.redisService.set('pattern:a', '1', 60, 'test-ns');
        await redis_service_1.redisService.set('pattern:b', '2', 60, 'test-ns');
        await redis_service_1.redisService.set('pattern:c', '3', 60, 'test-ns');
        const deleted = await redis_service_1.redisService.deletePattern('pattern:*', 'test-ns');
        (0, vitest_1.expect)(deleted).toBeGreaterThanOrEqual(3);
        (0, vitest_1.expect)(await redis_service_1.redisService.get('pattern:a', 'test-ns')).toBeNull();
    });
    (0, vitest_1.describe)('hashes', () => {
        (0, vitest_1.it)('should set and get a hash field', async () => {
            await redis_service_1.redisService.hSet('hash:1', 'name', 'Alice', 60, 'test-ns');
            const value = await redis_service_1.redisService.hGet('hash:1', 'name', 'test-ns');
            (0, vitest_1.expect)(value).toBe('Alice');
        });
        (0, vitest_1.it)('should set and get a JSON hash field', async () => {
            const profile = { age: 30, active: true };
            await redis_service_1.redisService.hSet('hash:json', 'profile', profile, 60, 'test-ns');
            const value = await redis_service_1.redisService.hGet('hash:json', 'profile', 'test-ns');
            (0, vitest_1.expect)(value).toEqual(profile);
        });
        (0, vitest_1.it)('should set multiple hash fields', async () => {
            await redis_service_1.redisService.hSetMultiple('hash:multi', { a: '1', b: 2, c: { nested: true } }, 60, 'test-ns');
            const all = await redis_service_1.redisService.hGetAll('hash:multi', 'test-ns');
            (0, vitest_1.expect)(all).toEqual({ a: 1, b: 2, c: { nested: true } });
        });
        (0, vitest_1.it)('should delete hash fields', async () => {
            await redis_service_1.redisService.hSet('hash:del', 'field', 'value', 60, 'test-ns');
            (0, vitest_1.expect)(await redis_service_1.redisService.hExists('hash:del', 'field', 'test-ns')).toBe(true);
            await redis_service_1.redisService.hDel('hash:del', 'field', 'test-ns');
            (0, vitest_1.expect)(await redis_service_1.redisService.hExists('hash:del', 'field', 'test-ns')).toBe(false);
        });
        (0, vitest_1.it)('should increment a hash field', async () => {
            await redis_service_1.redisService.hSet('hash:counter', 'count', 0, 60, 'test-ns');
            const value = await redis_service_1.redisService.hIncrBy('hash:counter', 'count', 5, 'test-ns');
            (0, vitest_1.expect)(value).toBe(5);
        });
        (0, vitest_1.it)('should return hash keys and length', async () => {
            await redis_service_1.redisService.hSetMultiple('hash:meta', { x: 1, y: 2 }, 60, 'test-ns');
            (0, vitest_1.expect)(await redis_service_1.redisService.hLen('hash:meta', 'test-ns')).toBe(2);
            const keys = await redis_service_1.redisService.hKeys('hash:meta', 'test-ns');
            (0, vitest_1.expect)(keys).toContain('x');
            (0, vitest_1.expect)(keys).toContain('y');
        });
    });
    (0, vitest_1.describe)('sorted sets', () => {
        (0, vitest_1.it)('should add and retrieve members by rank', async () => {
            await redis_service_1.redisService.zAdd('zset:rank', [
                { score: 10, value: 'a' },
                { score: 30, value: 'c' },
                { score: 20, value: 'b' },
            ], 60, 'test-ns');
            const range = await redis_service_1.redisService.zRange('zset:rank', 0, -1, 'test-ns');
            (0, vitest_1.expect)(range).toEqual(['a', 'b', 'c']);
        });
        (0, vitest_1.it)('should retrieve members with scores', async () => {
            await redis_service_1.redisService.zAdd('zset:scores', [{ score: 5, value: 'x' }], 60, 'test-ns');
            const result = await redis_service_1.redisService.zRangeWithScores('zset:scores', 0, -1, 'test-ns');
            (0, vitest_1.expect)(result).toEqual([{ score: 5, value: 'x' }]);
        });
        (0, vitest_1.it)('should support reverse range and rank', async () => {
            await redis_service_1.redisService.zAdd('zset:rev', [
                { score: 10, value: 'low' },
                { score: 50, value: 'high' },
            ], 60, 'test-ns');
            const rev = await redis_service_1.redisService.zRevRange('zset:rev', 0, -1, 'test-ns');
            (0, vitest_1.expect)(rev).toEqual(['high', 'low']);
            const rank = await redis_service_1.redisService.zRank('zset:rev', 'low', 'test-ns');
            (0, vitest_1.expect)(rank).toBe(0);
            const revRank = await redis_service_1.redisService.zRevRank('zset:rev', 'low', 'test-ns');
            (0, vitest_1.expect)(revRank).toBe(1);
        });
        (0, vitest_1.it)('should remove members and count ranges', async () => {
            await redis_service_1.redisService.zAdd('zset:count', [
                { score: 1, value: 'a' },
                { score: 2, value: 'b' },
                { score: 3, value: 'c' },
            ], 60, 'test-ns');
            (0, vitest_1.expect)(await redis_service_1.redisService.zCard('zset:count', 'test-ns')).toBe(3);
            (0, vitest_1.expect)(await redis_service_1.redisService.zCount('zset:count', 1, 2, 'test-ns')).toBe(2);
            await redis_service_1.redisService.zRem('zset:count', 'a', 'test-ns');
            (0, vitest_1.expect)(await redis_service_1.redisService.zCard('zset:count', 'test-ns')).toBe(2);
        });
        (0, vitest_1.it)('should increment member scores', async () => {
            await redis_service_1.redisService.zAdd('zset:incr', [{ score: 1, value: 'm' }], 60, 'test-ns');
            const score = await redis_service_1.redisService.zIncrBy('zset:incr', 'm', 4, 'test-ns');
            (0, vitest_1.expect)(score).toBe(5);
            (0, vitest_1.expect)(await redis_service_1.redisService.zScore('zset:incr', 'm', 'test-ns')).toBe(5);
        });
        (0, vitest_1.it)('should support sliding-window cleanup by score', async () => {
            await redis_service_1.redisService.zAdd('zset:window', [
                { score: 100, value: 'old' },
                { score: 200, value: 'keep' },
                { score: 300, value: 'new' },
            ], 60, 'test-ns');
            const removed = await redis_service_1.redisService.zRemRangeByScore('zset:window', 0, 150, 'test-ns');
            (0, vitest_1.expect)(removed).toBe(1);
            (0, vitest_1.expect)(await redis_service_1.redisService.zRange('zset:window', 0, -1, 'test-ns')).toEqual(['keep', 'new']);
        });
        (0, vitest_1.it)('should support JSON members', async () => {
            await redis_service_1.redisService.zAddJSON('zset:json', [
                { score: 1, value: { id: 'u1' } },
                { score: 2, value: { id: 'u2' } },
            ], 60, 'test-ns');
            const members = await redis_service_1.redisService.zRangeJSON('zset:json', 0, -1, 'test-ns');
            (0, vitest_1.expect)(members).toHaveLength(2);
            (0, vitest_1.expect)(members[0]).toEqual({ id: 'u1' });
        });
    });
    (0, vitest_1.describe)('TTL helpers', () => {
        (0, vitest_1.it)('should return TTL and allow persisting a key', async () => {
            await redis_service_1.redisService.set('ttl:key', 'value', 60, 'test-ns');
            const ttl = await redis_service_1.redisService.ttl('ttl:key', 'test-ns');
            (0, vitest_1.expect)(ttl).toBeGreaterThan(0);
            const persisted = await redis_service_1.redisService.persist('ttl:key', 'test-ns');
            (0, vitest_1.expect)(persisted).toBe(true);
            (0, vitest_1.expect)(await redis_service_1.redisService.ttl('ttl:key', 'test-ns')).toBe(-1);
        });
    });
});
//# sourceMappingURL=redis.test.js.map