import { redisService } from '../services/redis.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

const LOCK_NAMESPACE = 'cron';

/**
 * Execute a function with a Redis distributed lock.
 *
 * Only the first caller (across all server instances) acquires the lock and
 * runs the function. Subsequent callers skip execution until the lock is released
 * or expires.
 *
 * Use this to prevent cron jobs from running on multiple instances simultaneously.
 */
export const withDistributedLock = async <T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttlSeconds: number = env.CRON_JOB_LOCK_TTL_SECONDS
): Promise<T | undefined> => {
  const lock = await redisService.lock(lockKey, ttlSeconds, LOCK_NAMESPACE);

  if (!lock) {
    logger.debug('Cron job lock not acquired, skipping execution', {
      lockKey,
      namespace: LOCK_NAMESPACE,
    });
    return undefined;
  }

  try {
    logger.debug('Cron job lock acquired', { lockKey, namespace: LOCK_NAMESPACE });
    return await fn();
  } finally {
    await lock.release();
    logger.debug('Cron job lock released', { lockKey, namespace: LOCK_NAMESPACE });
  }
};

/**
 * Wrap a scheduled cron handler so it only runs on one server instance at a time.
 */
export const createLockedCronHandler = <T = void>(
  jobName: string,
  handler: () => Promise<T>,
  ttlSeconds: number = env.CRON_JOB_LOCK_TTL_SECONDS
): (() => Promise<T | undefined>) => {
  return async () => {
    const result = await withDistributedLock<T>(jobName, handler, ttlSeconds);

    if (result === undefined) {
      logger.info(`Cron job "${jobName}" skipped (lock held by another instance)`);
    }

    return result;
  };
};
