import { logger } from '../config/logger';
import { emailJob } from './email.job';
import { notificationJob } from './notification.job';
import { reminderJob } from './reminder.job';

export * from './email.job';
export * from './notification.job';
export * from './reminder.job';

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
  stopAll(): void {
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
  },

  /** Get health/status of each job. */
  async health(): Promise<{ name: string; queueSize: number; dlqSize: number }[]> {
    return Promise.all(
      [
        { name: 'email', stats: () => emailJob.stats() },
        { name: 'notification', stats: () => notificationJob.stats() },
        { name: 'reminder', stats: () => reminderJob.stats() },
      ].map(async (entry) => {
        const stats = await entry.stats();
        return { name: entry.name, ...stats };
      })
    );
  },
};
