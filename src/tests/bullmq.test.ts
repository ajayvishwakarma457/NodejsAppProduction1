import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redisService } from '../services/redis.service';
import { reportQueue } from '../jobs/report.job';
import { getBullQueueStats, closeAllBullQueues, getBullWorker } from '../services/bullmq.service';

describe('BullMQ report queue', () => {
  beforeAll(async () => {
    await redisService.connect();
    reportQueue.initialize();
  });

  afterAll(async () => {
    await closeAllBullQueues();
    await redisService.disconnect();
  });

  it('should enqueue a report generation job', async () => {
    const queue = reportQueue.getQueue();
    const worker = getBullWorker('report-generation');
    await worker?.pause();
    await queue.obliterate({ force: true });

    const job = await reportQueue.enqueue({
      reportType: 'projects',
      userId: 'user-123',
      filters: { status: 'active' },
    });

    expect(job.id).toBeDefined();
    expect(job.data.reportType).toBe('projects');
    expect(job.data.userId).toBe('user-123');

    const waiting = await queue.getWaitingCount();
    expect(waiting).toBe(1);

    await worker?.resume();
  });

  it('should enqueue a delayed report job', async () => {
    const queue = reportQueue.getQueue();
    await queue.obliterate({ force: true });

    const job = await reportQueue.enqueue(
      { reportType: 'tasks', userId: 'user-456' },
      { delay: 10000 }
    );

    expect(job.delay).toBe(10000);

    const delayed = await queue.getDelayedCount();
    expect(delayed).toBe(1);
  });

  it('should deduplicate jobs with the same jobId', async () => {
    const queue = reportQueue.getQueue();
    await queue.obliterate({ force: true });

    const job1 = await reportQueue.enqueue(
      { reportType: 'users', userId: 'user-789' },
      { jobId: 'unique-report-1' }
    );

    const job2 = await reportQueue.enqueue(
      { reportType: 'users', userId: 'user-789' },
      { jobId: 'unique-report-1' }
    );

    expect(job1.id).toBe(job2.id);
  });

  it('should return queue stats', async () => {
    const queue = reportQueue.getQueue();
    const worker = getBullWorker('report-generation');
    await worker?.pause();
    await queue.obliterate({ force: true });

    await reportQueue.enqueue({ reportType: 'projects', userId: 'user-stats' });

    const stats = await getBullQueueStats();
    const reportStats = stats.find((s) => s.name === 'report-generation');

    expect(reportStats).toBeDefined();
    expect(reportStats!.waiting).toBe(1);

    await worker?.resume();
  });
});
