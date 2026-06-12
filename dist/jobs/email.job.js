"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailJob = void 0;
const cron = __importStar(require("node-cron"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const email_service_1 = require("../services/email.service");
const distributed_lock_1 = require("../utils/distributed-lock");
const queue_1 = require("../utils/queue");
const emailQueue = (0, queue_1.createQueue)('email');
let task = null;
const processEmail = async (payload) => {
    try {
        const result = await email_service_1.emailService.send(payload);
        return { success: true, messageId: result.messageId };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
    }
};
exports.emailJob = {
    /** Enqueue an email to be sent by the background job. */
    async enqueue(payload) {
        await emailQueue.enqueue(payload);
        logger_1.logger.debug('Email enqueued', {
            to: payload.to,
            subject: payload.subject,
        });
    },
    /** Process a single batch of queued emails. */
    async processBatch() {
        const batchSize = env_1.env.EMAIL_JOB_BATCH_SIZE;
        const maxRetries = env_1.env.EMAIL_JOB_MAX_RETRIES;
        const items = await emailQueue.dequeueBatch(batchSize);
        let succeeded = 0;
        let failed = 0;
        let movedToDLQ = 0;
        for (const item of items) {
            const result = await processEmail(item.payload);
            if (result.success) {
                succeeded++;
                logger_1.logger.info('Email job sent successfully', {
                    id: item.id,
                    to: item.payload.to,
                    messageId: result.messageId,
                });
                continue;
            }
            failed++;
            item.retries++;
            item.lastError = result.error;
            if (item.retries <= maxRetries) {
                await emailQueue.requeue(item);
                logger_1.logger.warn('Email job failed, requeued for retry', {
                    id: item.id,
                    to: item.payload.to,
                    retries: item.retries,
                    error: result.error,
                });
            }
            else {
                await emailQueue.moveToDLQ(item);
                movedToDLQ++;
                logger_1.logger.error('Email job failed permanently, moved to DLQ', {
                    id: item.id,
                    to: item.payload.to,
                    retries: item.retries,
                    error: result.error,
                });
            }
        }
        return {
            processed: items.length,
            succeeded,
            failed,
            movedToDLQ,
        };
    },
    /** Get current queue and DLQ sizes. */
    async stats() {
        const [queueSize, dlqSize] = await Promise.all([emailQueue.size(), emailQueue.dlqSize()]);
        return { queueSize, dlqSize };
    },
    /** Start the scheduled email job. */
    start() {
        if (task) {
            logger_1.logger.warn('Email job already running');
            return;
        }
        if (!env_1.env.EMAIL_JOB_ENABLED) {
            logger_1.logger.info('Email job is disabled (EMAIL_JOB_ENABLED=false)');
            return;
        }
        if (!cron.validate(env_1.env.EMAIL_JOB_CRON)) {
            logger_1.logger.error('Invalid email job cron expression', {
                cron: env_1.env.EMAIL_JOB_CRON,
            });
            return;
        }
        const lockedProcessBatch = (0, distributed_lock_1.createLockedCronHandler)('email-job', () => this.processBatch());
        task = cron.schedule(env_1.env.EMAIL_JOB_CRON, async () => {
            try {
                logger_1.logger.debug('Email job batch starting');
                const result = await lockedProcessBatch();
                if (result && result.processed > 0) {
                    logger_1.logger.info('Email job batch completed', result);
                }
            }
            catch (error) {
                logger_1.logger.error('Email job batch crashed', {
                    error: error instanceof Error ? error.message : error,
                });
            }
        });
        logger_1.logger.info('Email job started', {
            cron: env_1.env.EMAIL_JOB_CRON,
            batchSize: env_1.env.EMAIL_JOB_BATCH_SIZE,
            maxRetries: env_1.env.EMAIL_JOB_MAX_RETRIES,
        });
    },
    /** Stop the scheduled email job. */
    stop() {
        if (task) {
            task.stop();
            task = null;
            logger_1.logger.info('Email job stopped');
        }
    },
    /** Peek at the next email in the queue without removing it. */
    async peek() {
        return emailQueue.peek();
    },
    /** Clear the entire queue (use with caution). */
    async clearQueue() {
        await emailQueue.clear();
        logger_1.logger.warn('Email queue cleared');
    },
    /** Clear the dead letter queue (use with caution). */
    async clearDLQ() {
        await emailQueue.clearDLQ();
        logger_1.logger.warn('Email DLQ cleared');
    },
};
//# sourceMappingURL=email.job.js.map