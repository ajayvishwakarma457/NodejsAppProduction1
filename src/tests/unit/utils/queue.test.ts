import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { redisService } from '../../../services/redis.service';
import { createQueue } from '../../../utils/queue';

describe('createQueue', () => {
  const q = createQueue<{ label: string }>('test-priority');

  beforeAll(async () => {
    await redisService.connect();
  });

  beforeEach(async () => {
    await q.clear();
    await q.clearDLQ();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('should enqueue and dequeue items in FIFO order by default', async () => {
    await q.enqueue({ label: 'a' });
    await q.enqueue({ label: 'b' });
    await q.enqueue({ label: 'c' });

    const first = await q.dequeue();
    const second = await q.dequeue();

    expect(first?.payload.label).toBe('a');
    expect(second?.payload.label).toBe('b');
    expect(await q.size()).toBe(1);
  });

  it('should track priority on queue items', async () => {
    await q.enqueue({ label: 'normal' });
    await q.enqueue({ label: 'urgent' }, undefined, 1);

    const item = await q.peek();
    expect(item?.payload.label).toBe('urgent');
    expect(item?.priority).toBe(1);
  });

  it('should dequeue higher priority jobs before lower priority and FIFO jobs', async () => {
    await q.enqueue({ label: 'fifo-1' });
    await q.enqueue({ label: 'low' }, undefined, 10);
    await q.enqueue({ label: 'high' }, undefined, 1);
    await q.enqueue({ label: 'medium' }, undefined, 5);
    await q.enqueue({ label: 'fifo-2' });

    const order: string[] = [];
    while ((await q.size()) > 0) {
      const item = await q.dequeue();
      if (item) order.push(item.payload.label);
    }

    expect(order).toEqual(['high', 'medium', 'low', 'fifo-1', 'fifo-2']);
  });

  it('should preserve priority when requeuing a failed item', async () => {
    await q.enqueue({ label: 'retry-me' }, undefined, 2);
    const item = await q.dequeue();
    expect(item?.priority).toBe(2);

    item!.retries = 1;
    item!.lastError = 'boom';
    await q.requeue(item!);

    const requeued = await q.peek();
    expect(requeued?.payload.label).toBe('retry-me');
    expect(requeued?.priority).toBe(2);
  });

  it('should include priority items in size and clear them', async () => {
    await q.enqueue({ label: 'normal' });
    await q.enqueue({ label: 'priority' }, undefined, 3);

    expect(await q.size()).toBe(2);

    await q.clear();
    expect(await q.size()).toBe(0);
  });
});
