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
exports.notificationJob = void 0;
const cron = __importStar(require("node-cron"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const notification_service_1 = require("../modules/notifications/notification.service");
const socket_service_1 = require("../services/socket.service");
const email_service_1 = require("../services/email.service");
const queue_1 = require("../utils/queue");
const distributed_lock_1 = require("../utils/distributed-lock");
const notificationQueue = (0, queue_1.createQueue)('notification');
let task = null;
const deliverViaSocket = (payload) => {
    try {
        socket_service_1.socketService.emitToUser(payload.userId, 'notification:new', {
            id: payload.notificationId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
        });
        return true;
    }
    catch (err) {
        logger_1.logger.warn('Socket delivery failed', {
            notificationId: payload.notificationId,
            error: err instanceof Error ? err.message : err,
        });
        return false;
    }
};
const deliverViaEmail = async (payload) => {
    try {
        await email_service_1.emailService.send({
            to: payload.userId,
            subject: payload.title,
            html: `<p>${payload.message}</p>`,
        });
        return true;
    }
    catch (err) {
        logger_1.logger.warn('Email delivery failed', {
            notificationId: payload.notificationId,
            error: err instanceof Error ? err.message : err,
        });
        return false;
    }
};
const processNotification = async (payload) => {
    const channelsDelivered = [];
    const channels = payload.channels.length > 0 ? payload.channels : ['in-app'];
    for (const channel of channels) {
        try {
            switch (channel) {
                case 'in-app': {
                    const marked = await notification_service_1.notificationService.markDelivered(payload.notificationId);
                    if (marked) {
                        channelsDelivered.push('in-app');
                    }
                    break;
                }
                case 'socket': {
                    const socketOk = deliverViaSocket(payload);
                    if (socketOk)
                        channelsDelivered.push('socket');
                    break;
                }
                case 'email': {
                    const emailOk = await deliverViaEmail(payload);
                    if (emailOk)
                        channelsDelivered.push('email');
                    break;
                }
            }
        }
        catch (err) {
            logger_1.logger.warn(`Notification channel "${channel}" failed`, {
                notificationId: payload.notificationId,
                error: err instanceof Error ? err.message : err,
            });
        }
    }
    const success = channelsDelivered.length > 0;
    if (!success) {
        return {
            success: false,
            channelsDelivered,
            error: 'All delivery channels failed',
        };
    }
    return { success, channelsDelivered };
};
exports.notificationJob = {
    /** Enqueue a notification for background delivery. */
    async enqueue(payload) {
        await notificationQueue.enqueue(payload);
        logger_1.logger.debug('Notification enqueued', {
            notificationId: payload.notificationId,
            channels: payload.channels,
        });
    },
    /** Process a single batch of queued notifications. */
    async processBatch() {
        const batchSize = env_1.env.NOTIFICATION_JOB_BATCH_SIZE;
        const maxRetries = env_1.env.NOTIFICATION_JOB_MAX_RETRIES;
        const items = await notificationQueue.dequeueBatch(batchSize);
        let succeeded = 0;
        let failed = 0;
        let movedToDLQ = 0;
        for (const item of items) {
            const result = await processNotification(item.payload);
            if (result.success) {
                succeeded++;
                logger_1.logger.info('Notification delivered', {
                    id: item.id,
                    notificationId: item.payload.notificationId,
                    channels: result.channelsDelivered,
                });
                continue;
            }
            failed++;
            item.retries++;
            item.lastError = result.error;
            await notification_service_1.notificationService.markFailed(item.payload.notificationId, result.error || 'Unknown error');
            if (item.retries <= maxRetries) {
                await notificationQueue.requeue(item);
                logger_1.logger.warn('Notification failed, requeued for retry', {
                    id: item.id,
                    notificationId: item.payload.notificationId,
                    retries: item.retries,
                    error: result.error,
                });
            }
            else {
                await notificationQueue.moveToDLQ(item);
                movedToDLQ++;
                logger_1.logger.error('Notification failed permanently, moved to DLQ', {
                    id: item.id,
                    notificationId: item.payload.notificationId,
                    retries: item.retries,
                    error: result.error,
                });
            }
        }
        return { processed: items.length, succeeded, failed, movedToDLQ };
    },
    /** Clean up old read notifications. */
    async cleanup() {
        const deleted = await notification_service_1.notificationService.cleanupOldReadNotifications(env_1.env.NOTIFICATION_CLEANUP_DAYS);
        if (deleted > 0) {
            logger_1.logger.info('Old notifications cleaned up', {
                deleted,
                olderThanDays: env_1.env.NOTIFICATION_CLEANUP_DAYS,
            });
        }
        return { deleted };
    },
    /** Get current queue and DLQ sizes. */
    async stats() {
        const [queueSize, dlqSize] = await Promise.all([
            notificationQueue.size(),
            notificationQueue.dlqSize(),
        ]);
        return { queueSize, dlqSize };
    },
    /** Start the scheduled notification job. */
    start() {
        if (task) {
            logger_1.logger.warn('Notification job already running');
            return;
        }
        if (!env_1.env.NOTIFICATION_JOB_ENABLED) {
            logger_1.logger.info('Notification job is disabled (NOTIFICATION_JOB_ENABLED=false)');
            return;
        }
        if (!cron.validate(env_1.env.NOTIFICATION_JOB_CRON)) {
            logger_1.logger.error('Invalid notification job cron expression', {
                cron: env_1.env.NOTIFICATION_JOB_CRON,
            });
            return;
        }
        const lockedCycle = (0, distributed_lock_1.createLockedCronHandler)('notification-job', async () => {
            const result = await this.processBatch();
            const cleanupResult = await this.cleanup();
            return { ...result, cleanedUp: cleanupResult.deleted };
        });
        task = cron.schedule(env_1.env.NOTIFICATION_JOB_CRON, async () => {
            try {
                logger_1.logger.debug('Notification job batch starting');
                const result = await lockedCycle();
                if (result && (result.processed > 0 || result.cleanedUp > 0)) {
                    logger_1.logger.info('Notification job cycle completed', result);
                }
            }
            catch (error) {
                logger_1.logger.error('Notification job cycle crashed', {
                    error: error instanceof Error ? error.message : error,
                });
            }
        });
        logger_1.logger.info('Notification job started', {
            cron: env_1.env.NOTIFICATION_JOB_CRON,
            batchSize: env_1.env.NOTIFICATION_JOB_BATCH_SIZE,
            maxRetries: env_1.env.NOTIFICATION_JOB_MAX_RETRIES,
            cleanupDays: env_1.env.NOTIFICATION_CLEANUP_DAYS,
        });
    },
    /** Stop the scheduled notification job. */
    stop() {
        if (task) {
            task.stop();
            task = null;
            logger_1.logger.info('Notification job stopped');
        }
    },
    /** Peek at the next notification in the queue without removing it. */
    async peek() {
        return notificationQueue.peek();
    },
    /** Clear the entire queue (use with caution). */
    async clearQueue() {
        await notificationQueue.clear();
        logger_1.logger.warn('Notification queue cleared');
    },
    /** Clear the dead letter queue (use with caution). */
    async clearDLQ() {
        await notificationQueue.clearDLQ();
        logger_1.logger.warn('Notification DLQ cleared');
    },
};
//# sourceMappingURL=notification.job.js.map