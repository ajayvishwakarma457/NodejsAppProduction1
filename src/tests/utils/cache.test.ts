import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../../services/redis.service';
import { cacheAside, CACHE_NAMESPACE } from '../../utils/cache';

describe('cacheAside', () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('returns cached value without calling factory on cache hit', async () => {
    const key = `cache-hit-${Date.now()}`;
    let calls = 0;
    const factory = async () => {
      calls++;
      return { id: key, name: 'Alice' };
    };

    const first = await cacheAside.getOrSet(CACHE_NAMESPACE.users, key, factory, 60);
    const second = await cacheAside.getOrSet(CACHE_NAMESPACE.users, key, factory, 60);

    expect(first).toEqual({ id: key, name: 'Alice' });
    expect(second).toEqual({ id: key, name: 'Alice' });
    expect(calls).toBe(1);
  });

  it('does not cache null or undefined values', async () => {
    const key = `cache-miss-${Date.now()}`;
    let calls = 0;
    const factory = async () => {
      calls++;
      return null;
    };

    const first = await cacheAside.getOrSet(CACHE_NAMESPACE.users, key, factory, 60);
    const second = await cacheAside.getOrSet(CACHE_NAMESPACE.users, key, factory, 60);

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(calls).toBe(2);
  });

  it('invalidates a single entity key', async () => {
    const key = `cache-invalidate-${Date.now()}`;
    const factory = async () => ({ id: key, cached: true });

    await cacheAside.getOrSet(CACHE_NAMESPACE.teams, key, factory, 60);
    await cacheAside.invalidate(CACHE_NAMESPACE.teams, key);

    let calls = 0;
    const nextFactory = async () => {
      calls++;
      return { id: key, cached: false };
    };

    const result = await cacheAside.getOrSet(CACHE_NAMESPACE.teams, key, nextFactory, 60);
    expect(result).toEqual({ id: key, cached: false });
    expect(calls).toBe(1);
  });

  it('invalidates entity key and matching list keys', async () => {
    const entityKey = `entity-${Date.now()}`;
    const listKey = `list:filter:p1:l10`;

    await cacheAside.getOrSet(
      CACHE_NAMESPACE.projects,
      entityKey,
      async () => ({ id: entityKey }),
      60
    );
    await cacheAside.getOrSet(CACHE_NAMESPACE.projects, listKey, async () => ({ items: [] }), 60);

    await cacheAside.invalidateEntity(CACHE_NAMESPACE.projects, entityKey);

    let entityCalls = 0;
    let listCalls = 0;
    const entity = await cacheAside.getOrSet(
      CACHE_NAMESPACE.projects,
      entityKey,
      async () => {
        entityCalls++;
        return { id: entityKey, fresh: true };
      },
      60
    );
    const list = await cacheAside.getOrSet(
      CACHE_NAMESPACE.projects,
      listKey,
      async () => {
        listCalls++;
        return { items: [1] };
      },
      60
    );

    expect(entity).toEqual({ id: entityKey, fresh: true });
    expect(list).toEqual({ items: [1] });
    expect(entityCalls).toBe(1);
    expect(listCalls).toBe(1);
  });

  it('isolates namespaces from each other', async () => {
    const key = `namespace-isolation-${Date.now()}`;

    await cacheAside.getOrSet(CACHE_NAMESPACE.users, key, async () => ({ source: 'users' }), 60);
    const tasksValue = await cacheAside.getOrSet(
      CACHE_NAMESPACE.tasks,
      key,
      async () => ({ source: 'tasks' }),
      60
    );

    expect(tasksValue).toEqual({ source: 'tasks' });
  });
});
