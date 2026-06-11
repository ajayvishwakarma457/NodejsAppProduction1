"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueue = void 0;
const redis_service_1 = require("../services/redis.service");
const createQueue = (name) => {
    const queueKey = `queue:${name}`;
    const dlqKey = `queue:${name}:dlq`;
    return {
        async enqueue(payload, id) {
            const item = {
                id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                payload,
                retries: 0,
                createdAt: new Date().toISOString(),
            };
            await redis_service_1.redisService.client.lPush(queueKey, JSON.stringify(item));
        },
        async dequeue() {
            const result = await redis_service_1.redisService.client.rPop(queueKey);
            if (!result)
                return null;
            return JSON.parse(result);
        },
        async dequeueBatch(count) {
            const items = [];
            for (let i = 0; i < count; i++) {
                const item = await this.dequeue();
                if (!item)
                    break;
                items.push(item);
            }
            return items;
        },
        async requeue(item) {
            await redis_service_1.redisService.client.lPush(queueKey, JSON.stringify(item));
        },
        async moveToDLQ(item) {
            await redis_service_1.redisService.client.lPush(dlqKey, JSON.stringify(item));
        },
        async size() {
            return redis_service_1.redisService.client.lLen(queueKey);
        },
        async dlqSize() {
            return redis_service_1.redisService.client.lLen(dlqKey);
        },
        async peek() {
            const result = await redis_service_1.redisService.client.lRange(queueKey, -1, -1);
            if (!result || result.length === 0)
                return null;
            return JSON.parse(result[0]);
        },
        async clear() {
            await redis_service_1.redisService.client.del(queueKey);
        },
        async clearDLQ() {
            await redis_service_1.redisService.client.del(dlqKey);
        },
    };
};
exports.createQueue = createQueue;
//# sourceMappingURL=queue.js.map