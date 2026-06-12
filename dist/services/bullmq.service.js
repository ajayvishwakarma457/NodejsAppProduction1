"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = exports.Queue = exports.Job = exports.getBullQueueStats = exports.closeAllBullQueues = exports.createBullQueue = exports.getBullWorker = exports.getBullQueue = void 0;
const bullmq_1 = require("bullmq");
Object.defineProperty(exports, "Queue", { enumerable: true, get: function () { return bullmq_1.Queue; } });
Object.defineProperty(exports, "Worker", { enumerable: true, get: function () { return bullmq_1.Worker; } });
Object.defineProperty(exports, "Job", { enumerable: true, get: function () { return bullmq_1.Job; } });
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
/**
 * BullMQ connection instance reused across queues and workers.
 * Using a single connection pool reduces Redis connection overhead.
 */
const connection = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
connection.on('error', (err) => {
    logger_1.logger.error('BullMQ Redis connection error', { error: err.message });
});
const queues = new Map();
/**
 * Create or retrieve a BullMQ queue.
 */
const getBullQueue = (name) => {
    const existing = queues.get(name)?.queue;
    if (existing)
        return existing;
    const queue = new bullmq_1.Queue(name, { connection });
    queues.set(name, { queue });
    return queue;
};
exports.getBullQueue = getBullQueue;
/**
 * Get an existing BullMQ worker by queue name.
 */
const getBullWorker = (name) => {
    return queues.get(name)?.worker;
};
exports.getBullWorker = getBullWorker;
/**
 * Create a BullMQ queue with an attached worker.
 *
 * The worker processes jobs concurrently and supports retries, backoff,
 * and automatic failed-job tracking out of the box.
 */
const createBullQueue = (options) => {
    const existing = queues.get(options.name);
    if (existing?.worker)
        return existing;
    const queue = (0, exports.getBullQueue)(options.name);
    const worker = new bullmq_1.Worker(options.name, async (job) => {
        logger_1.logger.info(`BullMQ job started`, { queue: options.name, jobId: job.id });
        const result = await options.processor(job);
        logger_1.logger.info(`BullMQ job completed`, { queue: options.name, jobId: job.id });
        return result;
    }, {
        connection,
        concurrency: 5,
        ...options.workerOptions,
    });
    worker.on('failed', (job, err) => {
        logger_1.logger.error(`BullMQ job failed`, {
            queue: options.name,
            jobId: job?.id,
            error: err.message,
            attempts: job?.attemptsMade,
        });
    });
    worker.on('error', (err) => {
        logger_1.logger.error(`BullMQ worker error`, { queue: options.name, error: err.message });
    });
    queues.set(options.name, { queue, worker });
    return { queue, worker };
};
exports.createBullQueue = createBullQueue;
/**
 * Gracefully close all BullMQ queues and workers.
 */
const closeAllBullQueues = async () => {
    for (const [name, { queue, worker }] of queues.entries()) {
        if (worker) {
            await worker.close();
            logger_1.logger.info(`BullMQ worker closed`, { queue: name });
        }
        await queue.close();
        logger_1.logger.info(`BullMQ queue closed`, { queue: name });
    }
    queues.clear();
};
exports.closeAllBullQueues = closeAllBullQueues;
/**
 * Get health stats for all registered BullMQ queues.
 */
const getBullQueueStats = async () => {
    return Promise.all(Array.from(queues.entries()).map(async ([name, { queue }]) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);
        return { name, waiting, active, completed, failed, delayed };
    }));
};
exports.getBullQueueStats = getBullQueueStats;
//# sourceMappingURL=bullmq.service.js.map