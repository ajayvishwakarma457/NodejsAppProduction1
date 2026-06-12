import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { jobOrchestrator, emailJob, notificationJob, reminderJob } from '../jobs';
import { redisService } from '../services/redis.service';
import { db } from '../config/db';

describe('jobOrchestrator', () => {
  beforeAll(async () => {
    await db.connect();
    await redisService.connect();
  });

  beforeEach(async () => {
    await emailJob.clearQueue();
    await emailJob.clearDLQ();
    await notificationJob.clearQueue();
    await notificationJob.clearDLQ();
    await reminderJob.clearQueue();
    await reminderJob.clearDLQ();
  });

  afterAll(async () => {
    await jobOrchestrator.stopAll();
    await redisService.disconnect();
    await db.disconnect();
  });

  it('should return health stats for all jobs', async () => {
    const health = await jobOrchestrator.health();

    const legacyJobs = health.filter((h) => 'queueSize' in h && 'dlqSize' in h);
    expect(legacyJobs).toHaveLength(3);
    expect(legacyJobs.map((h) => h.name)).toEqual(
      expect.arrayContaining(['email', 'notification', 'reminder'])
    );

    for (const entry of legacyJobs) {
      expect(entry).toHaveProperty('queueSize');
      expect(entry).toHaveProperty('dlqSize');
      expect(typeof entry.queueSize).toBe('number');
      expect(typeof entry.dlqSize).toBe('number');
    }
  });

  it('should start and stop all jobs without crashing', async () => {
    // Jobs are disabled by default in test env, so startAll should log but not crash
    expect(() => jobOrchestrator.startAll()).not.toThrow();
    await expect(jobOrchestrator.stopAll()).resolves.toBeUndefined();
  });

  it('should reflect queue changes in health stats', async () => {
    await emailJob.enqueue({
      to: 'a@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    const health = await jobOrchestrator.health();
    const emailHealth = health.find((h) => h.name === 'email');

    expect(emailHealth).toBeDefined();
    expect(emailHealth && 'queueSize' in emailHealth).toBe(true);
    if (emailHealth && 'queueSize' in emailHealth) {
      expect(emailHealth.queueSize).toBe(1);
    }
  });
});
