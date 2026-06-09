import { redisService } from "../services/redis.service";

export interface QueueItem<T> {
  id: string;
  payload: T;
  retries: number;
  createdAt: string;
  lastError?: string;
}

export const createQueue = <T>(name: string) => {
  const queueKey = `queue:${name}`;
  const dlqKey = `queue:${name}:dlq`;

  return {
    async enqueue(payload: T, id?: string): Promise<void> {
      const item: QueueItem<T> = {
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        payload,
        retries: 0,
        createdAt: new Date().toISOString()
      };
      await redisService.client.lPush(queueKey, JSON.stringify(item));
    },

    async dequeue(): Promise<QueueItem<T> | null> {
      const result = await redisService.client.rPop(queueKey);
      if (!result) return null;
      return JSON.parse(result) as QueueItem<T>;
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
      await redisService.client.lPush(queueKey, JSON.stringify(item));
    },

    async moveToDLQ(item: QueueItem<T>): Promise<void> {
      await redisService.client.lPush(dlqKey, JSON.stringify(item));
    },

    async size(): Promise<number> {
      return redisService.client.lLen(queueKey);
    },

    async dlqSize(): Promise<number> {
      return redisService.client.lLen(dlqKey);
    },

    async peek(): Promise<QueueItem<T> | null> {
      const result = await redisService.client.lRange(queueKey, -1, -1);
      if (!result || result.length === 0) return null;
      return JSON.parse(result[0]) as QueueItem<T>;
    },

    async clear(): Promise<void> {
      await redisService.client.del(queueKey);
    },

    async clearDLQ(): Promise<void> {
      await redisService.client.del(dlqKey);
    }
  };
};
