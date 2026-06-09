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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderJob = void 0;
const cron = __importStar(require("node-cron"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const task_service_1 = require("../modules/tasks/task.service");
const redis_service_1 = require("../services/redis.service");
const queue_1 = require("../utils/queue");
const email_job_1 = require("./email.job");
const notification_job_1 = require("./notification.job");
const reminderQueue = (0, queue_1.createQueue)("reminder");
const REMINDER_SENT_PREFIX = "reminder:sent:";
const REMINDER_SENT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
let task = null;
const parseWindows = () => {
    return env_1.env.REMINDER_WINDOWS_MINUTES.split(",").map((m) => parseInt(m.trim(), 10));
};
const isReminderAlreadySent = async (taskId, reminderType) => {
    const key = `${REMINDER_SENT_PREFIX}${taskId}:${reminderType}`;
    const value = await redis_service_1.redisService.get(key);
    return value === "1";
};
const markReminderSent = async (taskId, reminderType) => {
    const key = `${REMINDER_SENT_PREFIX}${taskId}:${reminderType}`;
    await redis_service_1.redisService.set(key, "1", REMINDER_SENT_TTL_SECONDS);
};
const buildReminderMessage = (payload) => {
    const due = new Date(payload.dueDate).toLocaleString();
    switch (payload.reminderType) {
        case "overdue":
            return `Task "${payload.taskTitle}" is overdue (was due ${due}).`;
        default: {
            const minutes = parseInt(payload.reminderType, 10);
            const label = minutes >= 1440
                ? `${Math.floor(minutes / 1440)} day(s)`
                : minutes >= 60
                    ? `${Math.floor(minutes / 60)} hour(s)`
                    : `${minutes} minute(s)`;
            return `Reminder: Task "${payload.taskTitle}" is due in ${label} (${due}).`;
        }
    }
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const deliverReminder = async (payload) => {
    try {
        if (!EMAIL_REGEX.test(payload.email)) {
            return { success: false, error: `Invalid email address: ${payload.email}` };
        }
        const message = buildReminderMessage(payload);
        // 1. Send in-app notification
        await notification_job_1.notificationJob.enqueue({
            notificationId: `reminder-${payload.taskId}-${payload.reminderType}`,
            userId: payload.userId,
            title: `Reminder: ${payload.taskTitle}`,
            message,
            channels: ["in-app"],
            type: "due-soon"
        });
        // 2. Send email
        await email_job_1.emailJob.enqueue({
            to: payload.email,
            subject: `Reminder: ${payload.taskTitle}`,
            html: `<p>${message}</p>`
        });
        return { success: true };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
    }
};
exports.reminderJob = {
    /** Scan for upcoming/overdue tasks and enqueue reminders. */
    async scan() {
        const now = new Date();
        const windows = parseWindows();
        let enqueued = 0;
        let skipped = 0;
        // Upcoming reminders
        for (const windowMinutes of windows) {
            const start = new Date(now.getTime() + windowMinutes * 60 * 1000);
            const end = new Date(start.getTime() + 6 * 60 * 60 * 1000); // scan 6h ahead
            const tasks = await task_service_1.taskService.findDueInRange(start, end);
            for (const task of tasks) {
                const taskDoc = task;
                const assigned = task.assignedTo;
                if (!assigned?._id || !assigned?.email) {
                    skipped++;
                    continue;
                }
                const reminderType = `${windowMinutes}m`;
                const alreadySent = await isReminderAlreadySent(taskDoc._id.toString(), reminderType);
                if (alreadySent) {
                    skipped++;
                    continue;
                }
                await reminderQueue.enqueue({
                    taskId: taskDoc._id.toString(),
                    userId: assigned._id.toString(),
                    email: assigned.email,
                    taskTitle: task.title,
                    dueDate: task.dueDate?.toISOString() || "",
                    reminderType
                });
                await markReminderSent(taskDoc._id.toString(), reminderType);
                enqueued++;
            }
        }
        // Overdue reminders
        if (env_1.env.REMINDER_OVERDUE_ENABLED) {
            const overdueTasks = await task_service_1.taskService.findOverdue(now);
            for (const task of overdueTasks) {
                const taskDoc = task;
                const assigned = task.assignedTo;
                if (!assigned?._id || !assigned?.email) {
                    skipped++;
                    continue;
                }
                const reminderType = "overdue";
                const alreadySent = await isReminderAlreadySent(taskDoc._id.toString(), reminderType);
                if (alreadySent) {
                    skipped++;
                    continue;
                }
                await reminderQueue.enqueue({
                    taskId: taskDoc._id.toString(),
                    userId: assigned._id.toString(),
                    email: assigned.email,
                    taskTitle: task.title,
                    dueDate: task.dueDate?.toISOString() || "",
                    reminderType
                });
                await markReminderSent(taskDoc._id.toString(), reminderType);
                enqueued++;
            }
        }
        if (enqueued > 0 || skipped > 0) {
            logger_1.logger.info("Reminder scan completed", { enqueued, skipped });
        }
        return { enqueued, skipped };
    },
    /** Process a single batch of queued reminders. */
    async processBatch() {
        const batchSize = env_1.env.REMINDER_JOB_BATCH_SIZE;
        const items = await reminderQueue.dequeueBatch(batchSize);
        let succeeded = 0;
        let failed = 0;
        let movedToDLQ = 0;
        for (const item of items) {
            const result = await deliverReminder(item.payload);
            if (result.success) {
                succeeded++;
                logger_1.logger.info("Reminder delivered", {
                    id: item.id,
                    taskId: item.payload.taskId,
                    reminderType: item.payload.reminderType,
                    to: item.payload.email
                });
                continue;
            }
            failed++;
            item.retries++;
            item.lastError = result.error;
            // Reminders don't retry forever — one requeue then DLQ
            if (item.retries <= 1) {
                await reminderQueue.requeue(item);
                logger_1.logger.warn("Reminder failed, requeued once", {
                    id: item.id,
                    taskId: item.payload.taskId,
                    error: result.error
                });
            }
            else {
                await reminderQueue.moveToDLQ(item);
                movedToDLQ++;
                logger_1.logger.error("Reminder failed permanently, moved to DLQ", {
                    id: item.id,
                    taskId: item.payload.taskId,
                    error: result.error
                });
            }
        }
        return { processed: items.length, succeeded, failed, movedToDLQ };
    },
    /** Get current queue and DLQ sizes. */
    async stats() {
        const [queueSize, dlqSize] = await Promise.all([
            reminderQueue.size(),
            reminderQueue.dlqSize()
        ]);
        return { queueSize, dlqSize };
    },
    /** Start the scheduled reminder job. */
    start() {
        if (task) {
            logger_1.logger.warn("Reminder job already running");
            return;
        }
        if (!env_1.env.REMINDER_JOB_ENABLED) {
            logger_1.logger.info("Reminder job is disabled (REMINDER_JOB_ENABLED=false)");
            return;
        }
        if (!cron.validate(env_1.env.REMINDER_JOB_CRON)) {
            logger_1.logger.error("Invalid reminder job cron expression", {
                cron: env_1.env.REMINDER_JOB_CRON
            });
            return;
        }
        task = cron.schedule(env_1.env.REMINDER_JOB_CRON, async () => {
            try {
                logger_1.logger.debug("Reminder job cycle starting");
                const scanResult = await this.scan();
                const batchResult = await this.processBatch();
                if (scanResult.enqueued > 0 || batchResult.processed > 0) {
                    logger_1.logger.info("Reminder job cycle completed", {
                        ...scanResult,
                        ...batchResult
                    });
                }
            }
            catch (error) {
                logger_1.logger.error("Reminder job cycle crashed", {
                    error: error instanceof Error ? error.message : error
                });
            }
        });
        logger_1.logger.info("Reminder job started", {
            cron: env_1.env.REMINDER_JOB_CRON,
            windows: env_1.env.REMINDER_WINDOWS_MINUTES,
            overdueEnabled: env_1.env.REMINDER_OVERDUE_ENABLED
        });
    },
    /** Stop the scheduled reminder job. */
    stop() {
        if (task) {
            task.stop();
            task = null;
            logger_1.logger.info("Reminder job stopped");
        }
    },
    /** Clear the entire queue (use with caution). */
    async clearQueue() {
        await reminderQueue.clear();
        logger_1.logger.warn("Reminder queue cleared");
    },
    /** Clear the dead letter queue (use with caution). */
    async clearDLQ() {
        await reminderQueue.clearDLQ();
        logger_1.logger.warn("Reminder DLQ cleared");
    }
};
