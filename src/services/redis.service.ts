import { redisClient } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { CACHE_TTL } from '../utils/constants';

const DEFAULT_PREFIX = `${env.APP_NAME}:`;
const JSON_PREFIX = '__json__:';

const buildKey = (key: string, namespace?: string): string => {
  if (namespace) {
    return `${DEFAULT_PREFIX}${namespace}:${key}`;
  }
  return `${DEFAULT_PREFIX}${key}`;
};

const serializeValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return `${JSON_PREFIX}${JSON.stringify(value)}`;
};

const deserializeValue = <T>(raw: string): T => {
  if (raw.startsWith(JSON_PREFIX)) {
    return JSON.parse(raw.slice(JSON_PREFIX.length)) as T;
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw) as unknown as T;
  }
  return raw as unknown as T;
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

  /* ------------------------------------------------------------------ */
  // Hashes
  /* ------------------------------------------------------------------ */

  /**
   * Set a single hash field. Optionally set TTL on the hash key.
   */
  async hSet(
    key: string,
    field: string,
    value: unknown,
    ttlSeconds?: number,
    namespace?: string
  ): Promise<boolean> {
    return safeExec(
      'hSet',
      async () => {
        const fullKey = buildKey(key, namespace);
        const count = await redisClient.hSet(fullKey, field, serializeValue(value));
        if (ttlSeconds !== undefined) {
          await redisClient.expire(fullKey, ttlSeconds);
        }
        return count === 0 || count === 1;
      },
      false
    );
  },

  /**
   * Set multiple hash fields from an object. Optionally set TTL on the hash key.
   */
  async hSetMultiple(
    key: string,
    fields: Record<string, unknown>,
    ttlSeconds?: number,
    namespace?: string
  ): Promise<boolean> {
    return safeExec(
      'hSetMultiple',
      async () => {
        const fullKey = buildKey(key, namespace);
        const serialized: Record<string, string> = {};
        for (const [field, value] of Object.entries(fields)) {
          serialized[field] = serializeValue(value);
        }

        const count = await redisClient.hSet(fullKey, serialized);
        if (ttlSeconds !== undefined) {
          await redisClient.expire(fullKey, ttlSeconds);
        }
        return count >= 0;
      },
      false
    );
  },

  /**
   * Get a single hash field.
   */
  async hGet<T>(key: string, field: string, namespace?: string): Promise<T | null> {
    return safeExec(
      'hGet',
      async () => {
        const fullKey = buildKey(key, namespace);
        const raw = await redisClient.hGet(fullKey, field);
        if (raw === undefined) return null;
        return deserializeValue<T>(raw);
      },
      null
    );
  },

  /**
   * Get all fields from a hash.
   */
  async hGetAll<T extends Record<string, unknown>>(
    key: string,
    namespace?: string
  ): Promise<T | null> {
    return safeExec(
      'hGetAll',
      async () => {
        const fullKey = buildKey(key, namespace);
        const raw = await redisClient.hGetAll(fullKey);
        if (Object.keys(raw).length === 0) return null;

        const result: Record<string, unknown> = {};
        for (const [field, value] of Object.entries(raw)) {
          result[field] = deserializeValue<unknown>(value);
        }
        return result as T;
      },
      null
    );
  },

  /**
   * Delete one or more fields from a hash.
   */
  async hDel(key: string, fields: string | string[], namespace?: string): Promise<number> {
    return safeExec(
      'hDel',
      async () => {
        const fullKey = buildKey(key, namespace);
        const fieldArray = Array.isArray(fields) ? fields : [fields];
        return redisClient.hDel(fullKey, fieldArray);
      },
      0
    );
  },

  /**
   * Check whether a hash field exists.
   */
  async hExists(key: string, field: string, namespace?: string): Promise<boolean> {
    return safeExec(
      'hExists',
      async () => redisClient.hExists(buildKey(key, namespace), field),
      false
    );
  },

  /**
   * Increment a hash field by a given amount.
   */
  async hIncrBy(
    key: string,
    field: string,
    amount: number = 1,
    namespace?: string
  ): Promise<number> {
    return safeExec(
      'hIncrBy',
      async () => redisClient.hIncrBy(buildKey(key, namespace), field, amount),
      0
    );
  },

  /**
   * Get all field names of a hash.
   */
  async hKeys(key: string, namespace?: string): Promise<string[]> {
    return safeExec('hKeys', async () => redisClient.hKeys(buildKey(key, namespace)), []);
  },

  /**
   * Get the number of fields in a hash.
   */
  async hLen(key: string, namespace?: string): Promise<number> {
    return safeExec('hLen', async () => redisClient.hLen(buildKey(key, namespace)), 0);
  },

  /* ------------------------------------------------------------------ */
  // Sorted Sets
  /* ------------------------------------------------------------------ */

  /**
   * Add members with scores to a sorted set. Optionally set TTL on the key.
   */
  async zAdd(
    key: string,
    members: Array<{ score: number; value: string }>,
    ttlSeconds?: number,
    namespace?: string
  ): Promise<number> {
    return safeExec(
      'zAdd',
      async () => {
        const fullKey = buildKey(key, namespace);
        const count = await redisClient.zAdd(fullKey, members);
        if (ttlSeconds !== undefined) {
          await redisClient.expire(fullKey, ttlSeconds);
        }
        return count;
      },
      0
    );
  },

  /**
   * Add members with scores to a sorted set, serializing non-string values.
   */
  async zAddJSON(
    key: string,
    members: Array<{ score: number; value: unknown }>,
    ttlSeconds?: number,
    namespace?: string
  ): Promise<number> {
    return this.zAdd(
      key,
      members.map((m) => ({ score: m.score, value: serializeValue(m.value) })),
      ttlSeconds,
      namespace
    );
  },

  /**
   * Remove one or more members from a sorted set.
   */
  async zRem(key: string, members: string | string[], namespace?: string): Promise<number> {
    return safeExec(
      'zRem',
      async () => {
        const fullKey = buildKey(key, namespace);
        const memberArray = Array.isArray(members) ? members : [members];
        return redisClient.zRem(fullKey, memberArray);
      },
      0
    );
  },

  /**
   * Get the score of a member in a sorted set.
   */
  async zScore(key: string, member: string, namespace?: string): Promise<number | null> {
    return safeExec(
      'zScore',
      async () => redisClient.zScore(buildKey(key, namespace), member),
      null
    );
  },

  /**
   * Get the number of members in a sorted set.
   */
  async zCard(key: string, namespace?: string): Promise<number> {
    return safeExec('zCard', async () => redisClient.zCard(buildKey(key, namespace)), 0);
  },

  /**
   * Count members with scores between min and max (inclusive).
   */
  async zCount(
    key: string,
    min: number | string = '-inf',
    max: number | string = '+inf',
    namespace?: string
  ): Promise<number> {
    return safeExec(
      'zCount',
      async () => redisClient.zCount(buildKey(key, namespace), min, max),
      0
    );
  },

  /**
   * Return members in a rank range (0-based, ascending by score).
   */
  async zRange(key: string, start: number, stop: number, namespace?: string): Promise<string[]> {
    return safeExec(
      'zRange',
      async () => redisClient.zRange(buildKey(key, namespace), start, stop),
      []
    );
  },

  /**
   * Return members with scores in a rank range.
   */
  async zRangeWithScores(
    key: string,
    start: number,
    stop: number,
    namespace?: string
  ): Promise<Array<{ score: number; value: string }>> {
    return safeExec(
      'zRangeWithScores',
      async () => redisClient.zRangeWithScores(buildKey(key, namespace), start, stop),
      []
    );
  },

  /**
   * Return members in a rank range, reverse order (highest score first).
   */
  async zRevRange(key: string, start: number, stop: number, namespace?: string): Promise<string[]> {
    return safeExec(
      'zRevRange',
      async () => redisClient.zRange(buildKey(key, namespace), start, stop, { REV: true }),
      []
    );
  },

  /**
   * Return members with scores in a rank range, reverse order.
   */
  async zRevRangeWithScores(
    key: string,
    start: number,
    stop: number,
    namespace?: string
  ): Promise<Array<{ score: number; value: string }>> {
    return safeExec(
      'zRevRangeWithScores',
      async () =>
        redisClient.zRangeWithScores(buildKey(key, namespace), start, stop, { REV: true }),
      []
    );
  },

  /**
   * Parse JSON-serialized members from zRange.
   */
  async zRangeJSON<T>(key: string, start: number, stop: number, namespace?: string): Promise<T[]> {
    const members = await this.zRange(key, start, stop, namespace);
    return members.map((m) => deserializeValue<T>(m));
  },

  /**
   * Parse JSON-serialized members from zRevRange.
   */
  async zRevRangeJSON<T>(
    key: string,
    start: number,
    stop: number,
    namespace?: string
  ): Promise<T[]> {
    const members = await this.zRevRange(key, start, stop, namespace);
    return members.map((m) => deserializeValue<T>(m));
  },

  /**
   * Parse JSON-serialized members from zRangeWithScores.
   */
  async zRangeWithScoresJSON<T>(
    key: string,
    start: number,
    stop: number,
    namespace?: string
  ): Promise<Array<{ score: number; value: T }>> {
    const members = await this.zRangeWithScores(key, start, stop, namespace);
    return members.map((m) => ({ score: m.score, value: deserializeValue<T>(m.value) }));
  },

  /**
   * Get the rank (0-based index) of a member in ascending order.
   */
  async zRank(key: string, member: string, namespace?: string): Promise<number | null> {
    return safeExec('zRank', async () => redisClient.zRank(buildKey(key, namespace), member), null);
  },

  /**
   * Get the rank of a member in descending order.
   */
  async zRevRank(key: string, member: string, namespace?: string): Promise<number | null> {
    return safeExec(
      'zRevRank',
      async () => redisClient.zRevRank(buildKey(key, namespace), member),
      null
    );
  },

  /**
   * Increment the score of a member by a given amount.
   */
  async zIncrBy(
    key: string,
    member: string,
    amount: number = 1,
    namespace?: string
  ): Promise<number> {
    return safeExec(
      'zIncrBy',
      async () => redisClient.zIncrBy(buildKey(key, namespace), amount, member),
      0
    );
  },

  /**
   * Remove members with scores between min and max (inclusive).
   * Useful for sliding-window cleanups.
   */
  async zRemRangeByScore(
    key: string,
    min: number | string,
    max: number | string,
    namespace?: string
  ): Promise<number> {
    return safeExec(
      'zRemRangeByScore',
      async () => redisClient.zRemRangeByScore(buildKey(key, namespace), min, max),
      0
    );
  },

  /* ------------------------------------------------------------------ */
  // TTL helpers
  /* ------------------------------------------------------------------ */

  /**
   * Get the remaining TTL (seconds) for a key. Returns -1 if no expiry, -2 if missing.
   */
  async ttl(key: string, namespace?: string): Promise<number> {
    return safeExec('ttl', async () => redisClient.ttl(buildKey(key, namespace)), -2);
  },

  /**
   * Remove the expiration from a key.
   */
  async persist(key: string, namespace?: string): Promise<boolean> {
    return safeExec('persist', async () => redisClient.persist(buildKey(key, namespace)), false);
  },
};
