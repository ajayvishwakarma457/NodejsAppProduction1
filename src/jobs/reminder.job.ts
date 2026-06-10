import * as cron from 'node-cron';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { taskService } from '../modules/tasks/task.service';
import { redisService } from '../services/redis.service';
import { createQueue } from '../utils/queue';
import { emailJob } from './email.job';
import { notificationJob } from './notification.job';

export interface ReminderPayload {
  taskId: string;
  userId: string;
  email: string;
  taskTitle: string;
  dueDate: string;
  reminderType: string;
}

const reminderQueue = createQueue<ReminderPayload>('reminder');

const REMINDER_SENT_PREFIX = 'reminder:sent:';
const REMINDER_SENT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

let task: cron.ScheduledTask | null = null;

const parseWindows = (): number[] => {
  return env.REMINDER_WINDOWS_MINUTES.split(',').map((m) => parseInt(m.trim(), 10));
};

const isReminderAlreadySent = async (taskId: string, reminderType: string): Promise<boolean> => {
  const key = `${REMINDER_SENT_PREFIX}${taskId}:${reminderType}`;
  const value = await redisService.get(key);
  return value === '1';
};

const markReminderSent = async (taskId: string, reminderType: string): Promise<void> => {
  const key = `${REMINDER_SENT_PREFIX}${taskId}:${reminderType}`;
  await redisService.set(key, '1', REMINDER_SENT_TTL_SECONDS);
};

const buildReminderMessage = (payload: ReminderPayload): string => {
  const due = new Date(payload.dueDate).toLocaleString();

  switch (payload.reminderType) {
    case 'overdue':
      return `Task "${payload.taskTitle}" is overdue (was due ${due}).`;
    default: {
      const minutes = parseInt(payload.reminderType, 10);
      const label =
        minutes >= 1440
          ? `${Math.floor(minutes / 1440)} day(s)`
          : minutes >= 60
            ? `${Math.floor(minutes / 60)} hour(s)`
            : `${minutes} minute(s)`;
      return `Reminder: Task "${payload.taskTitle}" is due in ${label} (${due}).`;
    }
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const deliverReminder = async (
  payload: ReminderPayload
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!EMAIL_REGEX.test(payload.email)) {
      return { success: false, error: `Invalid email address: ${payload.email}` };
    }

    const message = buildReminderMessage(payload);

    // 1. Send in-app notification
    await notificationJob.enqueue({
      notificationId: `reminder-${payload.taskId}-${payload.reminderType}`,
      userId: payload.userId,
      title: `Reminder: ${payload.taskTitle}`,
      message,
      channels: ['in-app'],
      type: 'due-soon',
    });

    // 2. Send email
    await emailJob.enqueue({
      to: payload.email,
      subject: `Reminder: ${payload.taskTitle}`,
      html: `<p>${message}</p>`,
    });

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
};

export const reminderJob = {
  /** Scan for upcoming/overdue tasks and enqueue reminders. */
  async scan(): Promise<{ enqueued: number; skipped: number }> {
    const now = new Date();
    const windows = parseWindows();
    let enqueued = 0;
    let skipped = 0;

    // Upcoming reminders
    for (const windowMinutes of windows) {
      const start = new Date(now.getTime() + windowMinutes * 60 * 1000);
      const end = new Date(start.getTime() + 6 * 60 * 60 * 1000); // scan 6h ahead

      const tasks = await taskService.findDueInRange(start, end);

      for (const task of tasks) {
        const taskDoc = task as unknown as { _id: Types.ObjectId };
        const assigned = task.assignedTo as unknown as
          | { _id: Types.ObjectId; email: string }
          | undefined;
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
          dueDate: task.dueDate?.toISOString() || '',
          reminderType,
        });

        await markReminderSent(taskDoc._id.toString(), reminderType);
        enqueued++;
      }
    }

    // Overdue reminders
    if (env.REMINDER_OVERDUE_ENABLED) {
      const overdueTasks = await taskService.findOverdue(now);

      for (const task of overdueTasks) {
        const taskDoc = task as unknown as { _id: Types.ObjectId };
        const assigned = task.assignedTo as unknown as
          | { _id: Types.ObjectId; email: string }
          | undefined;
        if (!assigned?._id || !assigned?.email) {
          skipped++;
          continue;
        }

        const reminderType = 'overdue';
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
          dueDate: task.dueDate?.toISOString() || '',
          reminderType,
        });

        await markReminderSent(taskDoc._id.toString(), reminderType);
        enqueued++;
      }
    }

    if (enqueued > 0 || skipped > 0) {
      logger.info('Reminder scan completed', { enqueued, skipped });
    }

    return { enqueued, skipped };
  },

  /** Process a single batch of queued reminders. */
  async processBatch(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    movedToDLQ: number;
  }> {
    const batchSize = env.REMINDER_JOB_BATCH_SIZE;
    const items = await reminderQueue.dequeueBatch(batchSize);

    let succeeded = 0;
    let failed = 0;
    let movedToDLQ = 0;

    for (const item of items) {
      const result = await deliverReminder(item.payload);

      if (result.success) {
        succeeded++;
        logger.info('Reminder delivered', {
          id: item.id,
          taskId: item.payload.taskId,
          reminderType: item.payload.reminderType,
          to: item.payload.email,
        });
        continue;
      }

      failed++;
      item.retries++;
      item.lastError = result.error;

      // Reminders don't retry forever — one requeue then DLQ
      if (item.retries <= 1) {
        await reminderQueue.requeue(item);
        logger.warn('Reminder failed, requeued once', {
          id: item.id,
          taskId: item.payload.taskId,
          error: result.error,
        });
      } else {
        await reminderQueue.moveToDLQ(item);
        movedToDLQ++;
        logger.error('Reminder failed permanently, moved to DLQ', {
          id: item.id,
          taskId: item.payload.taskId,
          error: result.error,
        });
      }
    }

    return { processed: items.length, succeeded, failed, movedToDLQ };
  },

  /** Get current queue and DLQ sizes. */
  async stats(): Promise<{ queueSize: number; dlqSize: number }> {
    const [queueSize, dlqSize] = await Promise.all([reminderQueue.size(), reminderQueue.dlqSize()]);
    return { queueSize, dlqSize };
  },

  /** Start the scheduled reminder job. */
  start(): void {
    if (task) {
      logger.warn('Reminder job already running');
      return;
    }

    if (!env.REMINDER_JOB_ENABLED) {
      logger.info('Reminder job is disabled (REMINDER_JOB_ENABLED=false)');
      return;
    }

    if (!cron.validate(env.REMINDER_JOB_CRON)) {
      logger.error('Invalid reminder job cron expression', {
        cron: env.REMINDER_JOB_CRON,
      });
      return;
    }

    task = cron.schedule(env.REMINDER_JOB_CRON, async () => {
      try {
        logger.debug('Reminder job cycle starting');
        const scanResult = await this.scan();
        const batchResult = await this.processBatch();

        if (scanResult.enqueued > 0 || batchResult.processed > 0) {
          logger.info('Reminder job cycle completed', {
            ...scanResult,
            ...batchResult,
          });
        }
      } catch (error) {
        logger.error('Reminder job cycle crashed', {
          error: error instanceof Error ? error.message : error,
        });
      }
    });

    logger.info('Reminder job started', {
      cron: env.REMINDER_JOB_CRON,
      windows: env.REMINDER_WINDOWS_MINUTES,
      overdueEnabled: env.REMINDER_OVERDUE_ENABLED,
    });
  },

  /** Stop the scheduled reminder job. */
  stop(): void {
    if (task) {
      task.stop();
      task = null;
      logger.info('Reminder job stopped');
    }
  },

  /** Clear the entire queue (use with caution). */
  async clearQueue(): Promise<void> {
    await reminderQueue.clear();
    logger.warn('Reminder queue cleared');
  },

  /** Clear the dead letter queue (use with caution). */
  async clearDLQ(): Promise<void> {
    await reminderQueue.clearDLQ();
    logger.warn('Reminder DLQ cleared');
  },
};
