import { redisService } from '../services/redis.service';
import { CACHE_TTL } from './constants';

/* ------------------------------------------------------------------ */
// Namespaces
/* ------------------------------------------------------------------ */

export const CACHE_NAMESPACE = {
  users: 'users',
  teams: 'teams',
  projects: 'projects',
  tasks: 'tasks',
} as const;

export type CacheNamespace = keyof typeof CACHE_NAMESPACE;

/* ------------------------------------------------------------------ */
// Cache-aside helpers
/* ------------------------------------------------------------------ */

/**
 * Production-grade cache-aside helper.
 *
 * - Reads from Redis first.
 * - Falls back to the factory on miss and stores the result.
 * - Serializes/deserializes JSON automatically.
 * - Isolated per namespace for predictable invalidation.
 *
 * The key is scoped to the namespace automatically by redisService,
 * so callers should pass a plain key such as the entity id or a
 * list descriptor (e.g. `list:<hash>:p1:l10`).
 */
export const cacheAside = {
  async getOrSet<T>(
    namespace: CacheNamespace,
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.medium
  ): Promise<T | null> {
    return redisService.getOrSet(key, factory, ttlSeconds, namespace);
  },

  async invalidate(namespace: CacheNamespace, key: string): Promise<void> {
    await redisService.del(key, namespace);
  },

  async invalidatePattern(namespace: CacheNamespace, pattern: string): Promise<void> {
    await redisService.deletePattern(pattern, namespace);
  },

  /**
   * Invalidate a single entity plus any list caches in the namespace.
   * Use this after creates/updates/deletes to keep list responses fresh.
   */
  async invalidateEntity(namespace: CacheNamespace, id: string): Promise<void> {
    await Promise.all([
      this.invalidate(namespace, id),
      this.invalidatePattern(namespace, 'list:*'),
    ]);
  },
};
