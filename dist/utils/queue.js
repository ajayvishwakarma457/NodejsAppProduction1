"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueue = void 0;
const redis_service_1 = require("../services/redis.service");
const createQueue = (name) => {
    const queueKey = `queue:${name}`;
    const priorityKey = `queue:${name}:priority`;
    const dlqKey = `queue:${name}:dlq`;
    const serialize = (item) => JSON.stringify(item);
    const deserialize = (data) => JSON.parse(data);
    return {
        async enqueue(payload, id, priority) {
            const item = {
                id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                payload,
                retries: 0,
                createdAt: new Date().toISOString(),
                priority,
            };
            if (priority !== undefined) {
                await redis_service_1.redisService.client.zAdd(priorityKey, { score: priority, value: serialize(item) });
                return;
            }
            await redis_service_1.redisService.client.lPush(queueKey, serialize(item));
        },
        async dequeue() {
            const priorityResult = await redis_service_1.redisService.client.zRange(priorityKey, 0, 0);
            if (priorityResult && priorityResult.length > 0) {
                await redis_service_1.redisService.client.zRem(priorityKey, priorityResult[0]);
                return deserialize(priorityResult[0]);
            }
            const result = await redis_service_1.redisService.client.rPop(queueKey);
            if (!result)
                return null;
            return deserialize(result);
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
            if (item.priority !== undefined) {
                await redis_service_1.redisService.client.zAdd(priorityKey, {
                    score: item.priority,
                    value: serialize(item),
                });
                return;
            }
            await redis_service_1.redisService.client.lPush(queueKey, serialize(item));
        },
        async moveToDLQ(item) {
            await redis_service_1.redisService.client.lPush(dlqKey, serialize(item));
        },
        async size() {
            const [listSize, prioritySize] = await Promise.all([
                redis_service_1.redisService.client.lLen(queueKey),
                redis_service_1.redisService.client.zCard(priorityKey),
            ]);
            return listSize + prioritySize;
        },
        async dlqSize() {
            return redis_service_1.redisService.client.lLen(dlqKey);
        },
        async peek() {
            const priorityResult = await redis_service_1.redisService.client.zRange(priorityKey, 0, 0);
            if (priorityResult && priorityResult.length > 0) {
                return deserialize(priorityResult[0]);
            }
            const result = await redis_service_1.redisService.client.lRange(queueKey, -1, -1);
            if (!result || result.length === 0)
                return null;
            return deserialize(result[0]);
        },
        async clear() {
            await redis_service_1.redisService.client.del(queueKey);
            await redis_service_1.redisService.client.del(priorityKey);
        },
        async clearDLQ() {
            await redis_service_1.redisService.client.del(dlqKey);
        },
    };
};
exports.createQueue = createQueue;
//# sourceMappingURL=queue.js.map