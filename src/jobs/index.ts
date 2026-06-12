import { logger } from '../config/logger';
import { closeAllBullQueues, getBullQueueStats } from '../services/bullmq.service';
import { emailJob } from './email.job';
import { notificationJob } from './notification.job';
import { reminderJob } from './reminder.job';
import { reportQueue } from './report.job';

export * from './email.job';
export * from './notification.job';
export * from './reminder.job';
export * from './report.job';

interface JobRegistryEntry {
  name: string;
  start: () => void;
  stop: () => void;
}

const jobs: JobRegistryEntry[] = [
  { name: 'email', start: () => emailJob.start(), stop: () => emailJob.stop() },
  {
    name: 'notification',
    start: () => notificationJob.start(),
    stop: () => notificationJob.stop(),
  },
  { name: 'reminder', start: () => reminderJob.start(), stop: () => reminderJob.stop() },
];

export const jobOrchestrator = {
  /** Start all registered background jobs. */
  startAll(): void {
    logger.info('Starting background jobs...', { count: jobs.length });

    // Initialize BullMQ queues/workers for new features
    reportQueue.initialize();

    for (const job of jobs) {
      try {
        job.start();
      } catch (error) {
        logger.error(`Failed to start job: ${job.name}`, {
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  },

  /** Stop all registered background jobs. */
  async stopAll(): Promise<void> {
    logger.info('Stopping background jobs...', { count: jobs.length });
    for (const job of jobs) {
      try {
        job.stop();
      } catch (error) {
        logger.error(`Failed to stop job: ${job.name}`, {
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    await closeAllBullQueues();
  },

  /** Get health/status of each job. */
  async health(): Promise<
    (
      | { name: string; queueSize: number; dlqSize: number }
      | {
          name: string;
          waiting: number;
          active: number;
          completed: number;
          failed: number;
          delayed: number;
        }
    )[]
  > {
    const legacyHealth = await Promise.all(
      [
        { name: 'email', stats: () => emailJob.stats() },
        { name: 'notification', stats: () => notificationJob.stats() },
        { name: 'reminder', stats: () => reminderJob.stats() },
      ].map(async (entry) => {
        const stats = await entry.stats();
        return { name: entry.name, ...stats };
      })
    );

    const bullStats = await getBullQueueStats();
    const bullHealth = bullStats.map((stats) => ({ ...stats }));

    return [...legacyHealth, ...bullHealth];
  },
};
