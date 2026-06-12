import { redisService } from '../services/redis.service';

export interface QueueItem<T> {
  id: string;
  payload: T;
  retries: number;
  createdAt: string;
  lastError?: string;
  priority?: number;
}

export const createQueue = <T>(name: string) => {
  const queueKey = `queue:${name}`;
  const priorityKey = `queue:${name}:priority`;
  const dlqKey = `queue:${name}:dlq`;

  const serialize = (item: QueueItem<T>): string => JSON.stringify(item);
  const deserialize = (data: string): QueueItem<T> => JSON.parse(data) as QueueItem<T>;

  return {
    async enqueue(payload: T, id?: string, priority?: number): Promise<void> {
      const item: QueueItem<T> = {
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        payload,
        retries: 0,
        createdAt: new Date().toISOString(),
        priority,
      };

      if (priority !== undefined) {
        await redisService.client.zAdd(priorityKey, { score: priority, value: serialize(item) });
        return;
      }

      await redisService.client.lPush(queueKey, serialize(item));
    },

    async dequeue(): Promise<QueueItem<T> | null> {
      const priorityResult = await redisService.client.zRange(priorityKey, 0, 0);
      if (priorityResult && priorityResult.length > 0) {
        await redisService.client.zRem(priorityKey, priorityResult[0]);
        return deserialize(priorityResult[0]);
      }

      const result = await redisService.client.rPop(queueKey);
      if (!result) return null;
      return deserialize(result);
    },

    async dequeueBatch(count: number): Promise<QueueItem<T>[]> {
      const items: QueueItem<T>[] = [];
      for (let i = 0; i < count; i++) {
        const item = await this.dequeue();
        if (!item) break;
        items.push(item);
      }
      return items;
    },

    async requeue(item: QueueItem<T>): Promise<void> {
      if (item.priority !== undefined) {
        await redisService.client.zAdd(priorityKey, {
          score: item.priority,
          value: serialize(item),
        });
        return;
      }

      await redisService.client.lPush(queueKey, serialize(item));
    },

    async moveToDLQ(item: QueueItem<T>): Promise<void> {
      await redisService.client.lPush(dlqKey, serialize(item));
    },

    async size(): Promise<number> {
      const [listSize, prioritySize] = await Promise.all([
        redisService.client.lLen(queueKey),
        redisService.client.zCard(priorityKey),
      ]);
      return listSize + prioritySize;
    },

    async dlqSize(): Promise<number> {
      return redisService.client.lLen(dlqKey);
    },

    async peek(): Promise<QueueItem<T> | null> {
      const priorityResult = await redisService.client.zRange(priorityKey, 0, 0);
      if (priorityResult && priorityResult.length > 0) {
        return deserialize(priorityResult[0]);
      }

      const result = await redisService.client.lRange(queueKey, -1, -1);
      if (!result || result.length === 0) return null;
      return deserialize(result[0]);
    },

    async clear(): Promise<void> {
      await redisService.client.del(queueKey);
      await redisService.client.del(priorityKey);
    },

    async clearDLQ(): Promise<void> {
      await redisService.client.del(dlqKey);
    },
  };
};
