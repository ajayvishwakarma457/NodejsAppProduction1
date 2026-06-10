import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../services/redis.service';

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
});
