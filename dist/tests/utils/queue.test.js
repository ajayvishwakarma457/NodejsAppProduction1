"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../../services/redis.service");
const queue_1 = require("../../utils/queue");
(0, vitest_1.describe)('createQueue', () => {
    const q = (0, queue_1.createQueue)('test-priority');
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.beforeEach)(async () => {
        await q.clear();
        await q.clearDLQ();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should enqueue and dequeue items in FIFO order by default', async () => {
        await q.enqueue({ label: 'a' });
        await q.enqueue({ label: 'b' });
        await q.enqueue({ label: 'c' });
        const first = await q.dequeue();
        const second = await q.dequeue();
        (0, vitest_1.expect)(first?.payload.label).toBe('a');
        (0, vitest_1.expect)(second?.payload.label).toBe('b');
        (0, vitest_1.expect)(await q.size()).toBe(1);
    });
    (0, vitest_1.it)('should track priority on queue items', async () => {
        await q.enqueue({ label: 'normal' });
        await q.enqueue({ label: 'urgent' }, undefined, 1);
        const item = await q.peek();
        (0, vitest_1.expect)(item?.payload.label).toBe('urgent');
        (0, vitest_1.expect)(item?.priority).toBe(1);
    });
    (0, vitest_1.it)('should dequeue higher priority jobs before lower priority and FIFO jobs', async () => {
        await q.enqueue({ label: 'fifo-1' });
        await q.enqueue({ label: 'low' }, undefined, 10);
        await q.enqueue({ label: 'high' }, undefined, 1);
        await q.enqueue({ label: 'medium' }, undefined, 5);
        await q.enqueue({ label: 'fifo-2' });
        const order = [];
        while ((await q.size()) > 0) {
            const item = await q.dequeue();
            if (item)
                order.push(item.payload.label);
        }
        (0, vitest_1.expect)(order).toEqual(['high', 'medium', 'low', 'fifo-1', 'fifo-2']);
    });
    (0, vitest_1.it)('should preserve priority when requeuing a failed item', async () => {
        await q.enqueue({ label: 'retry-me' }, undefined, 2);
        const item = await q.dequeue();
        (0, vitest_1.expect)(item?.priority).toBe(2);
        item.retries = 1;
        item.lastError = 'boom';
        await q.requeue(item);
        const requeued = await q.peek();
        (0, vitest_1.expect)(requeued?.payload.label).toBe('retry-me');
        (0, vitest_1.expect)(requeued?.priority).toBe(2);
    });
    (0, vitest_1.it)('should include priority items in size and clear them', async () => {
        await q.enqueue({ label: 'normal' });
        await q.enqueue({ label: 'priority' }, undefined, 3);
        (0, vitest_1.expect)(await q.size()).toBe(2);
        await q.clear();
        (0, vitest_1.expect)(await q.size()).toBe(0);
    });
});
//# sourceMappingURL=queue.test.js.map