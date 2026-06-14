import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../../services/redis.service';

describe('redisService', () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('should pass health check', async () => {
    const healthy = await redisService.health();
    expect(healthy).toBe(true);
  });

  it('should set and get a string value', async () => {
    await redisService.set('test:key', 'hello', 60, 'test-ns');
    const value = await redisService.get('test:key', 'test-ns');
    expect(value).toBe('hello');
  });

  it('should set and get JSON', async () => {
    const data = { id: 1, name: 'Alice' };
    await redisService.setJSON('test:json', data, 60, 'test-ns');
    const result = await redisService.getJSON<{ id: number; name: string }>('test:json', 'test-ns');
    expect(result).toEqual(data);
  });

  it('should return null for missing key', async () => {
    const value = await redisService.get('test:missing', 'test-ns');
    expect(value).toBeNull();
  });

  it('should delete a key', async () => {
    await redisService.set('test:del', 'bye', 60, 'test-ns');
    await redisService.del('test:del', 'test-ns');
    const value = await redisService.get('test:del', 'test-ns');
    expect(value).toBeNull();
  });

  it('should check key existence', async () => {
    await redisService.set('test:exists', 'yes', 60, 'test-ns');
    expect(await redisService.exists('test:exists', 'test-ns')).toBe(true);
    expect(await redisService.exists('test:nope', 'test-ns')).toBe(false);
  });

  it('should increment and decrement', async () => {
    const key = 'test:counter';
    await redisService.del(key, 'test-ns');

    const v1 = await redisService.incrBy(key, 5, 'test-ns');
    expect(v1).toBe(5);

    const v2 = await redisService.decrBy(key, 2, 'test-ns');
    expect(v2).toBe(3);
  });

  it('should support getOrSet pattern', async () => {
    await redisService.del('test:lazy', 'test-ns');

    let calls = 0;
    const factory = async () => {
      calls++;
      return { data: 'computed' };
    };

    // First call computes
    const r1 = await redisService.getOrSet('test:lazy', factory, 60, 'test-ns');
    expect(r1).toEqual({ data: 'computed' });
    expect(calls).toBe(1);

    // Second call returns cached
    const r2 = await redisService.getOrSet('test:lazy', factory, 60, 'test-ns');
    expect(r2).toEqual({ data: 'computed' });
    expect(calls).toBe(1);
  });

  it('should acquire and release a lock', async () => {
    const lock = await redisService.lock('test:resource', 10, 'test-ns');
    expect(lock).not.toBeNull();

    // Second acquire should fail
    const lock2 = await redisService.lock('test:resource', 10, 'test-ns');
    expect(lock2).toBeNull();

    // Release and re-acquire
    await lock!.release();
    const lock3 = await redisService.lock('test:resource', 10, 'test-ns');
    expect(lock3).not.toBeNull();
    await lock3!.release();
  });

  it('should delete keys by pattern', async () => {
    await redisService.set('pattern:a', '1', 60, 'test-ns');
    await redisService.set('pattern:b', '2', 60, 'test-ns');
    await redisService.set('pattern:c', '3', 60, 'test-ns');

    const deleted = await redisService.deletePattern('pattern:*', 'test-ns');
    expect(deleted).toBeGreaterThanOrEqual(3);

    expect(await redisService.get('pattern:a', 'test-ns')).toBeNull();
  });

  describe('hashes', () => {
    it('should set and get a hash field', async () => {
      await redisService.hSet('hash:1', 'name', 'Alice', 60, 'test-ns');
      const value = await redisService.hGet<string>('hash:1', 'name', 'test-ns');
      expect(value).toBe('Alice');
    });

    it('should set and get a JSON hash field', async () => {
      const profile = { age: 30, active: true };
      await redisService.hSet('hash:json', 'profile', profile, 60, 'test-ns');
      const value = await redisService.hGet<{ age: number; active: boolean }>(
        'hash:json',
        'profile',
        'test-ns'
      );
      expect(value).toEqual(profile);
    });

    it('should set multiple hash fields', async () => {
      await redisService.hSetMultiple(
        'hash:multi',
        { a: '1', b: 2, c: { nested: true } },
        60,
        'test-ns'
      );
      const all = await redisService.hGetAll<Record<string, unknown>>('hash:multi', 'test-ns');
      expect(all).toEqual({ a: 1, b: 2, c: { nested: true } });
    });

    it('should delete hash fields', async () => {
      await redisService.hSet('hash:del', 'field', 'value', 60, 'test-ns');
      expect(await redisService.hExists('hash:del', 'field', 'test-ns')).toBe(true);
      await redisService.hDel('hash:del', 'field', 'test-ns');
      expect(await redisService.hExists('hash:del', 'field', 'test-ns')).toBe(false);
    });

    it('should increment a hash field', async () => {
      await redisService.hSet('hash:counter', 'count', 0, 60, 'test-ns');
      const value = await redisService.hIncrBy('hash:counter', 'count', 5, 'test-ns');
      expect(value).toBe(5);
    });

    it('should return hash keys and length', async () => {
      await redisService.hSetMultiple('hash:meta', { x: 1, y: 2 }, 60, 'test-ns');
      expect(await redisService.hLen('hash:meta', 'test-ns')).toBe(2);
      const keys = await redisService.hKeys('hash:meta', 'test-ns');
      expect(keys).toContain('x');
      expect(keys).toContain('y');
    });
  });

  describe('sorted sets', () => {
    it('should add and retrieve members by rank', async () => {
      await redisService.zAdd(
        'zset:rank',
        [
          { score: 10, value: 'a' },
          { score: 30, value: 'c' },
          { score: 20, value: 'b' },
        ],
        60,
        'test-ns'
      );

      const range = await redisService.zRange('zset:rank', 0, -1, 'test-ns');
      expect(range).toEqual(['a', 'b', 'c']);
    });

    it('should retrieve members with scores', async () => {
      await redisService.zAdd('zset:scores', [{ score: 5, value: 'x' }], 60, 'test-ns');
      const result = await redisService.zRangeWithScores('zset:scores', 0, -1, 'test-ns');
      expect(result).toEqual([{ score: 5, value: 'x' }]);
    });

    it('should support reverse range and rank', async () => {
      await redisService.zAdd(
        'zset:rev',
        [
          { score: 10, value: 'low' },
          { score: 50, value: 'high' },
        ],
        60,
        'test-ns'
      );

      const rev = await redisService.zRevRange('zset:rev', 0, -1, 'test-ns');
      expect(rev).toEqual(['high', 'low']);

      const rank = await redisService.zRank('zset:rev', 'low', 'test-ns');
      expect(rank).toBe(0);

      const revRank = await redisService.zRevRank('zset:rev', 'low', 'test-ns');
      expect(revRank).toBe(1);
    });

    it('should remove members and count ranges', async () => {
      await redisService.zAdd(
        'zset:count',
        [
          { score: 1, value: 'a' },
          { score: 2, value: 'b' },
          { score: 3, value: 'c' },
        ],
        60,
        'test-ns'
      );

      expect(await redisService.zCard('zset:count', 'test-ns')).toBe(3);
      expect(await redisService.zCount('zset:count', 1, 2, 'test-ns')).toBe(2);

      await redisService.zRem('zset:count', 'a', 'test-ns');
      expect(await redisService.zCard('zset:count', 'test-ns')).toBe(2);
    });

    it('should increment member scores', async () => {
      await redisService.zAdd('zset:incr', [{ score: 1, value: 'm' }], 60, 'test-ns');
      const score = await redisService.zIncrBy('zset:incr', 'm', 4, 'test-ns');
      expect(score).toBe(5);
      expect(await redisService.zScore('zset:incr', 'm', 'test-ns')).toBe(5);
    });

    it('should support sliding-window cleanup by score', async () => {
      await redisService.zAdd(
        'zset:window',
        [
          { score: 100, value: 'old' },
          { score: 200, value: 'keep' },
          { score: 300, value: 'new' },
        ],
        60,
        'test-ns'
      );

      const removed = await redisService.zRemRangeByScore('zset:window', 0, 150, 'test-ns');
      expect(removed).toBe(1);
      expect(await redisService.zRange('zset:window', 0, -1, 'test-ns')).toEqual(['keep', 'new']);
    });

    it('should support JSON members', async () => {
      await redisService.zAddJSON(
        'zset:json',
        [
          { score: 1, value: { id: 'u1' } },
          { score: 2, value: { id: 'u2' } },
        ],
        60,
        'test-ns'
      );

      const members = await redisService.zRangeJSON<{ id: string }>('zset:json', 0, -1, 'test-ns');
      expect(members).toHaveLength(2);
      expect(members[0]).toEqual({ id: 'u1' });
    });
  });

  describe('TTL helpers', () => {
    it('should return TTL and allow persisting a key', async () => {
      await redisService.set('ttl:key', 'value', 60, 'test-ns');
      const ttl = await redisService.ttl('ttl:key', 'test-ns');
      expect(ttl).toBeGreaterThan(0);

      const persisted = await redisService.persist('ttl:key', 'test-ns');
      expect(persisted).toBe(true);
      expect(await redisService.ttl('ttl:key', 'test-ns')).toBe(-1);
    });
  });
});
