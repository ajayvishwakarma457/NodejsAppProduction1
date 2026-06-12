"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLockedCronHandler = exports.withDistributedLock = void 0;
const redis_service_1 = require("../services/redis.service");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
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
const withDistributedLock = async (lockKey, fn, ttlSeconds = env_1.env.CRON_JOB_LOCK_TTL_SECONDS) => {
    const lock = await redis_service_1.redisService.lock(lockKey, ttlSeconds, LOCK_NAMESPACE);
    if (!lock) {
        logger_1.logger.debug('Cron job lock not acquired, skipping execution', {
            lockKey,
            namespace: LOCK_NAMESPACE,
        });
        return undefined;
    }
    try {
        logger_1.logger.debug('Cron job lock acquired', { lockKey, namespace: LOCK_NAMESPACE });
        return await fn();
    }
    finally {
        await lock.release();
        logger_1.logger.debug('Cron job lock released', { lockKey, namespace: LOCK_NAMESPACE });
    }
};
exports.withDistributedLock = withDistributedLock;
/**
 * Wrap a scheduled cron handler so it only runs on one server instance at a time.
 */
const createLockedCronHandler = (jobName, handler, ttlSeconds = env_1.env.CRON_JOB_LOCK_TTL_SECONDS) => {
    return async () => {
        const result = await (0, exports.withDistributedLock)(jobName, handler, ttlSeconds);
        if (result === undefined) {
            logger_1.logger.info(`Cron job "${jobName}" skipped (lock held by another instance)`);
        }
        return result;
    };
};
exports.createLockedCronHandler = createLockedCronHandler;
//# sourceMappingURL=distributed-lock.js.map