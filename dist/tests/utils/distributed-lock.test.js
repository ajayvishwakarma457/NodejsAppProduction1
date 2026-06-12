"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../../services/redis.service");
const distributed_lock_1 = require("../../utils/distributed-lock");
(0, vitest_1.describe)('distributed-lock', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should execute the callback when lock is acquired', async () => {
        const result = await (0, distributed_lock_1.withDistributedLock)('test-lock-1', async () => 'executed');
        (0, vitest_1.expect)(result).toBe('executed');
    });
    (0, vitest_1.it)('should skip execution when lock is already held', async () => {
        const first = await redis_service_1.redisService.lock('test-lock-2', 10, 'cron');
        (0, vitest_1.expect)(first).not.toBeNull();
        try {
            const result = await (0, distributed_lock_1.withDistributedLock)('test-lock-2', async () => 'executed');
            (0, vitest_1.expect)(result).toBeUndefined();
        }
        finally {
            await first?.release();
        }
    });
    (0, vitest_1.it)('createLockedCronHandler should run handler only once across concurrent calls', async () => {
        let callCount = 0;
        const handler = (0, distributed_lock_1.createLockedCronHandler)('concurrent-test', async () => {
            callCount++;
            await new Promise((resolve) => setTimeout(resolve, 50));
            return callCount;
        });
        const [r1, r2, r3] = await Promise.all([handler(), handler(), handler()]);
        // Only one invocation should succeed; the others should be skipped
        const results = [r1, r2, r3].filter((r) => r !== undefined);
        (0, vitest_1.expect)(results.length).toBe(1);
        (0, vitest_1.expect)(callCount).toBe(1);
    });
});
//# sourceMappingURL=distributed-lock.test.js.map