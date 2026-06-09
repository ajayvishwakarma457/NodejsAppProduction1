"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../services/redis.service");
(0, vitest_1.describe)("redisService", () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)("should pass health check", async () => {
        const healthy = await redis_service_1.redisService.health();
        (0, vitest_1.expect)(healthy).toBe(true);
    });
    (0, vitest_1.it)("should set and get a string value", async () => {
        await redis_service_1.redisService.set("test:key", "hello", 60, "test-ns");
        const value = await redis_service_1.redisService.get("test:key", "test-ns");
        (0, vitest_1.expect)(value).toBe("hello");
    });
    (0, vitest_1.it)("should set and get JSON", async () => {
        const data = { id: 1, name: "Alice" };
        await redis_service_1.redisService.setJSON("test:json", data, 60, "test-ns");
        const result = await redis_service_1.redisService.getJSON("test:json", "test-ns");
        (0, vitest_1.expect)(result).toEqual(data);
    });
    (0, vitest_1.it)("should return null for missing key", async () => {
        const value = await redis_service_1.redisService.get("test:missing", "test-ns");
        (0, vitest_1.expect)(value).toBeNull();
    });
    (0, vitest_1.it)("should delete a key", async () => {
        await redis_service_1.redisService.set("test:del", "bye", 60, "test-ns");
        await redis_service_1.redisService.del("test:del", "test-ns");
        const value = await redis_service_1.redisService.get("test:del", "test-ns");
        (0, vitest_1.expect)(value).toBeNull();
    });
    (0, vitest_1.it)("should check key existence", async () => {
        await redis_service_1.redisService.set("test:exists", "yes", 60, "test-ns");
        (0, vitest_1.expect)(await redis_service_1.redisService.exists("test:exists", "test-ns")).toBe(true);
        (0, vitest_1.expect)(await redis_service_1.redisService.exists("test:nope", "test-ns")).toBe(false);
    });
    (0, vitest_1.it)("should increment and decrement", async () => {
        const key = "test:counter";
        await redis_service_1.redisService.del(key, "test-ns");
        const v1 = await redis_service_1.redisService.incrBy(key, 5, "test-ns");
        (0, vitest_1.expect)(v1).toBe(5);
        const v2 = await redis_service_1.redisService.decrBy(key, 2, "test-ns");
        (0, vitest_1.expect)(v2).toBe(3);
    });
    (0, vitest_1.it)("should support getOrSet pattern", async () => {
        let calls = 0;
        const factory = async () => {
            calls++;
            return { data: "computed" };
        };
        // First call computes
        const r1 = await redis_service_1.redisService.getOrSet("test:lazy", factory, 60, "test-ns");
        (0, vitest_1.expect)(r1).toEqual({ data: "computed" });
        (0, vitest_1.expect)(calls).toBe(1);
        // Second call returns cached
        const r2 = await redis_service_1.redisService.getOrSet("test:lazy", factory, 60, "test-ns");
        (0, vitest_1.expect)(r2).toEqual({ data: "computed" });
        (0, vitest_1.expect)(calls).toBe(1);
    });
    (0, vitest_1.it)("should acquire and release a lock", async () => {
        const lock = await redis_service_1.redisService.lock("test:resource", 10, "test-ns");
        (0, vitest_1.expect)(lock).not.toBeNull();
        // Second acquire should fail
        const lock2 = await redis_service_1.redisService.lock("test:resource", 10, "test-ns");
        (0, vitest_1.expect)(lock2).toBeNull();
        // Release and re-acquire
        await lock.release();
        const lock3 = await redis_service_1.redisService.lock("test:resource", 10, "test-ns");
        (0, vitest_1.expect)(lock3).not.toBeNull();
        await lock3.release();
    });
    (0, vitest_1.it)("should delete keys by pattern", async () => {
        await redis_service_1.redisService.set("pattern:a", "1", 60, "test-ns");
        await redis_service_1.redisService.set("pattern:b", "2", 60, "test-ns");
        await redis_service_1.redisService.set("pattern:c", "3", 60, "test-ns");
        const deleted = await redis_service_1.redisService.deletePattern("pattern:*", "test-ns");
        (0, vitest_1.expect)(deleted).toBeGreaterThanOrEqual(3);
        (0, vitest_1.expect)(await redis_service_1.redisService.get("pattern:a", "test-ns")).toBeNull();
    });
});
