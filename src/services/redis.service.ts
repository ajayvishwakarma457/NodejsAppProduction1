import { redisClient } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { CACHE_TTL } from '../utils/constants';

const DEFAULT_PREFIX = `${env.APP_NAME}:`;

const buildKey = (key: string, namespace?: string): string => {
  if (namespace) {
    return `${DEFAULT_PREFIX}${namespace}:${key}`;
  }
  return `${DEFAULT_PREFIX}${key}`;
};

const safeExec = async <T>(operation: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Redis operation failed: ${operation}`, {
      error: error instanceof Error ? error.message : error,
    });
    return fallback;
  }
};

export const redisService = {
  /** Raw Redis client for advanced use-cases. */
  get client() {
    return redisClient;
  },

  /** Connect to Redis. */
  async connect(): Promise<void> {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  },

  /** Disconnect from Redis. */
  async disconnect(): Promise<void> {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  },

  /** Check Redis connectivity. */
  async health(): Promise<boolean> {
    return safeExec(
      'health',
      async () => {
        const pong = await redisClient.ping();
        return pong === 'PONG';
      },
      false
    );
  },

  /** Set a string value with optional TTL (seconds). */
  async set(
    key: string,
    value: string,
    ttlSeconds: number = CACHE_TTL.medium,
    namespace?: string
  ): Promise<boolean> {
    return safeExec(
      'set',
      async () => {
        const fullKey = buildKey(key, namespace);
        await redisClient.setEx(fullKey, ttlSeconds, value);
        return true;
      },
      false
    );
  },

  /** Get a string value. */
  async get(key: string, namespace?: string): Promise<string | null> {
    return safeExec(
      'get',
      async () => {
        const fullKey = buildKey(key, namespace);
        return redisClient.get(fullKey);
      },
      null
    );
  },

  /** Delete one or more keys. */
  async del(key: string | string[], namespace?: string): Promise<number> {
    return safeExec(
      'del',
      async () => {
        const keys = Array.isArray(key) ? key : [key];
        const fullKeys = keys.map((k) => buildKey(k, namespace));
        return redisClient.del(fullKeys);
      },
      0
    );
  },

  /** Set a JSON value with optional TTL (seconds). */
  async setJSON<T>(
    key: string,
    value: T,
    ttlSeconds: number = CACHE_TTL.medium,
    namespace?: string
  ): Promise<boolean> {
    return this.set(key, JSON.stringify(value), ttlSeconds, namespace);
  },

  /** Get and parse a JSON value. */
  async getJSON<T>(key: string, namespace?: string): Promise<T | null> {
    const raw = await this.get(key, namespace);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.error('Redis JSON parse failed', { key, error });
      return null;
    }
  },

  /** Cache-aside pattern: fetch from cache or set via factory. */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.medium,
    namespace?: string
  ): Promise<T | null> {
    const cached = await this.getJSON<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    if (value !== null && value !== undefined) {
      await this.setJSON(key, value, ttlSeconds, namespace);
    }
    return value ?? null;
  },

  /** Check if a key exists. */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const count = await safeExec(
      'exists',
      async () => redisClient.exists(buildKey(key, namespace)),
      0
    );
    return count > 0;
  },

  /** Set expiration (seconds) on an existing key. */
  async expire(key: string, ttlSeconds: number, namespace?: string): Promise<boolean> {
    const result = await safeExec(
      'expire',
      async () => redisClient.expire(buildKey(key, namespace), ttlSeconds),
      false
    );
    return result;
  },

  /** Increment a key by a given amount. */
  async incrBy(key: string, amount: number = 1, namespace?: string): Promise<number> {
    return safeExec('incrBy', async () => redisClient.incrBy(buildKey(key, namespace), amount), 0);
  },

  /** Decrement a key by a given amount. */
  async decrBy(key: string, amount: number = 1, namespace?: string): Promise<number> {
    return safeExec('decrBy', async () => redisClient.decrBy(buildKey(key, namespace), amount), 0);
  },

  /** Delete keys matching a pattern (uses SCAN to avoid blocking). */
  async deletePattern(pattern: string, namespace?: string): Promise<number> {
    return safeExec(
      'deletePattern',
      async () => {
        const fullPattern = buildKey(pattern, namespace);
        let cursor = 0;
        let deleted = 0;

        do {
          const result = await redisClient.scan(cursor, {
            MATCH: fullPattern,
            COUNT: 100,
          });

          cursor = result.cursor;

          if (result.keys.length > 0) {
            await redisClient.del(result.keys);
            deleted += result.keys.length;
          }
        } while (cursor !== 0);

        return deleted;
      },
      0
    );
  },

  /** Acquire a distributed lock (simple SET NX EX pattern). */
  async lock(
    lockKey: string,
    ttlSeconds: number = 30,
    namespace?: string
  ): Promise<{ release: () => Promise<void> } | null> {
    const fullKey = buildKey(`lock:${lockKey}`, namespace);
    const token = `${Date.now()}-${Math.random()}`;

    const acquired = await safeExec(
      'lock',
      async () => {
        const result = await redisClient.set(fullKey, token, {
          NX: true,
          EX: ttlSeconds,
        });
        return result === 'OK';
      },
      false
    );

    if (!acquired) return null;

    return {
      release: async () => {
        await safeExec(
          'releaseLock',
          async () => {
            const current = await redisClient.get(fullKey);
            if (current === token) {
              await redisClient.del(fullKey);
            }
          },
          undefined
        );
      },
    };
  },
};
