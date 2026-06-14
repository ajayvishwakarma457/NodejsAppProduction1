import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../../../services/redis.service';
import { withDistributedLock, createLockedCronHandler } from '../../../utils/distributed-lock';

describe('distributed-lock', () => {
  beforeAll(async () => {
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('should execute the callback when lock is acquired', async () => {
    const result = await withDistributedLock('test-lock-1', async () => 'executed');
    expect(result).toBe('executed');
  });

  it('should skip execution when lock is already held', async () => {
    const first = await redisService.lock('test-lock-2', 10, 'cron');
    expect(first).not.toBeNull();

    try {
      const result = await withDistributedLock('test-lock-2', async () => 'executed');
      expect(result).toBeUndefined();
    } finally {
      await first?.release();
    }
  });

  it('createLockedCronHandler should run handler only once across concurrent calls', async () => {
    let callCount = 0;
    const handler = createLockedCronHandler('concurrent-test', async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return callCount;
    });

    const [r1, r2, r3] = await Promise.all([handler(), handler(), handler()]);

    // Only one invocation should succeed; the others should be skipped
    const results = [r1, r2, r3].filter((r) => r !== undefined);
    expect(results.length).toBe(1);
    expect(callCount).toBe(1);
  });
});
