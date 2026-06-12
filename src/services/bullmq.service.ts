import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * BullMQ connection instance reused across queues and workers.
 * Using a single connection pool reduces Redis connection overhead.
 */
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  logger.error('BullMQ Redis connection error', { error: err.message });
});

export interface BullQueue {
  queue: Queue;
  worker?: Worker;
}

export interface CreateBullQueueOptions<T> {
  name: string;
  processor: (job: Job<T>) => Promise<unknown>;
  queueOptions?: Omit<QueueOptions, 'connection'>;
  workerOptions?: Omit<WorkerOptions, 'connection'>;
}

const queues = new Map<string, BullQueue>();

/**
 * Create or retrieve a BullMQ queue.
 */
export const getBullQueue = <T>(name: string): Queue<T> => {
  const existing = queues.get(name)?.queue as Queue<T> | undefined;
  if (existing) return existing;

  const queue = new Queue<T>(name, { connection });
  queues.set(name, { queue });
  return queue;
};

/**
 * Get an existing BullMQ worker by queue name.
 */
export const getBullWorker = <T>(name: string): Worker<T> | undefined => {
  return queues.get(name)?.worker as Worker<T> | undefined;
};

/**
 * Create a BullMQ queue with an attached worker.
 *
 * The worker processes jobs concurrently and supports retries, backoff,
 * and automatic failed-job tracking out of the box.
 */
export const createBullQueue = <T>(options: CreateBullQueueOptions<T>): BullQueue => {
  const existing = queues.get(options.name);
  if (existing?.worker) return existing;

  const queue = getBullQueue<T>(options.name);

  const worker = new Worker<T>(
    options.name,
    async (job) => {
      logger.info(`BullMQ job started`, { queue: options.name, jobId: job.id });
      const result = await options.processor(job);
      logger.info(`BullMQ job completed`, { queue: options.name, jobId: job.id });
      return result;
    },
    {
      connection,
      concurrency: 5,
      ...options.workerOptions,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`BullMQ job failed`, {
      queue: options.name,
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error(`BullMQ worker error`, { queue: options.name, error: err.message });
  });

  queues.set(options.name, { queue, worker });

  return { queue, worker };
};

/**
 * Gracefully close all BullMQ queues and workers.
 */
export const closeAllBullQueues = async (): Promise<void> => {
  for (const [name, { queue, worker }] of queues.entries()) {
    if (worker) {
      await worker.close();
      logger.info(`BullMQ worker closed`, { queue: name });
    }
    await queue.close();
    logger.info(`BullMQ queue closed`, { queue: name });
  }
  queues.clear();
};

/**
 * Get health stats for all registered BullMQ queues.
 */
export const getBullQueueStats = async (): Promise<
  {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }[]
> => {
  return Promise.all(
    Array.from(queues.entries()).map(async ([name, { queue }]) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return { name, waiting, active, completed, failed, delayed };
    })
  );
};

/**
 * Re-export Job type and connection for advanced use-cases.
 */
export { Job, Queue, Worker };
