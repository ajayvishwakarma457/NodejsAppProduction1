import * as cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { notificationService } from '../modules/notifications/notification.service';
import { socketService } from '../services/socket.service';
import { emailService } from '../services/email.service';
import { createQueue } from '../utils/queue';
import { SOCKET_ROOM_PREFIX } from '../utils/constants';

export interface NotificationQueuePayload {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  channels: ('in-app' | 'email' | 'socket')[];
  type: string;
}

const notificationQueue = createQueue<NotificationQueuePayload>('notification');

let task: cron.ScheduledTask | null = null;

const deliverViaSocket = (payload: NotificationQueuePayload): boolean => {
  try {
    const room = `${SOCKET_ROOM_PREFIX.notification}${payload.userId}`;
    socketService.emitToRoom(room, 'notification:new', {
      id: payload.notificationId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });
    return true;
  } catch (err) {
    logger.warn('Socket delivery failed', {
      notificationId: payload.notificationId,
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
};

const deliverViaEmail = async (payload: NotificationQueuePayload): Promise<boolean> => {
  try {
    await emailService.send({
      to: payload.userId,
      subject: payload.title,
      html: `<p>${payload.message}</p>`,
    });
    return true;
  } catch (err) {
    logger.warn('Email delivery failed', {
      notificationId: payload.notificationId,
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
};

const processNotification = async (
  payload: NotificationQueuePayload
): Promise<{ success: boolean; channelsDelivered: string[]; error?: string }> => {
  const channelsDelivered: string[] = [];
  const channels = payload.channels.length > 0 ? payload.channels : ['in-app'];

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in-app': {
          const marked = await notificationService.markDelivered(payload.notificationId);
          if (marked) {
            channelsDelivered.push('in-app');
          }
          break;
        }
        case 'socket': {
          const socketOk = deliverViaSocket(payload);
          if (socketOk) channelsDelivered.push('socket');
          break;
        }
        case 'email': {
          const emailOk = await deliverViaEmail(payload);
          if (emailOk) channelsDelivered.push('email');
          break;
        }
      }
    } catch (err) {
      logger.warn(`Notification channel "${channel}" failed`, {
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

export const notificationJob = {
  /** Enqueue a notification for background delivery. */
  async enqueue(payload: NotificationQueuePayload): Promise<void> {
    await notificationQueue.enqueue(payload);
    logger.debug('Notification enqueued', {
      notificationId: payload.notificationId,
      channels: payload.channels,
    });
  },

  /** Process a single batch of queued notifications. */
  async processBatch(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    movedToDLQ: number;
  }> {
    const batchSize = env.NOTIFICATION_JOB_BATCH_SIZE;
    const maxRetries = env.NOTIFICATION_JOB_MAX_RETRIES;
    const items = await notificationQueue.dequeueBatch(batchSize);

    let succeeded = 0;
    let failed = 0;
    let movedToDLQ = 0;

    for (const item of items) {
      const result = await processNotification(item.payload);

      if (result.success) {
        succeeded++;
        logger.info('Notification delivered', {
          id: item.id,
          notificationId: item.payload.notificationId,
          channels: result.channelsDelivered,
        });
        continue;
      }

      failed++;
      item.retries++;
      item.lastError = result.error;

      await notificationService.markFailed(
        item.payload.notificationId,
        result.error || 'Unknown error'
      );

      if (item.retries <= maxRetries) {
        await notificationQueue.requeue(item);
        logger.warn('Notification failed, requeued for retry', {
          id: item.id,
          notificationId: item.payload.notificationId,
          retries: item.retries,
          error: result.error,
        });
      } else {
        await notificationQueue.moveToDLQ(item);
        movedToDLQ++;
        logger.error('Notification failed permanently, moved to DLQ', {
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
  async cleanup(): Promise<{ deleted: number }> {
    const deleted = await notificationService.cleanupOldReadNotifications(
      env.NOTIFICATION_CLEANUP_DAYS
    );

    if (deleted > 0) {
      logger.info('Old notifications cleaned up', {
        deleted,
        olderThanDays: env.NOTIFICATION_CLEANUP_DAYS,
      });
    }

    return { deleted };
  },

  /** Get current queue and DLQ sizes. */
  async stats(): Promise<{ queueSize: number; dlqSize: number }> {
    const [queueSize, dlqSize] = await Promise.all([
      notificationQueue.size(),
      notificationQueue.dlqSize(),
    ]);
    return { queueSize, dlqSize };
  },

  /** Start the scheduled notification job. */
  start(): void {
    if (task) {
      logger.warn('Notification job already running');
      return;
    }

    if (!env.NOTIFICATION_JOB_ENABLED) {
      logger.info('Notification job is disabled (NOTIFICATION_JOB_ENABLED=false)');
      return;
    }

    if (!cron.validate(env.NOTIFICATION_JOB_CRON)) {
      logger.error('Invalid notification job cron expression', {
        cron: env.NOTIFICATION_JOB_CRON,
      });
      return;
    }

    task = cron.schedule(env.NOTIFICATION_JOB_CRON, async () => {
      try {
        logger.debug('Notification job batch starting');
        const result = await this.processBatch();
        const cleanupResult = await this.cleanup();

        if (result.processed > 0 || cleanupResult.deleted > 0) {
          logger.info('Notification job cycle completed', {
            ...result,
            cleanedUp: cleanupResult.deleted,
          });
        }
      } catch (error) {
        logger.error('Notification job cycle crashed', {
          error: error instanceof Error ? error.message : error,
        });
      }
    });

    logger.info('Notification job started', {
      cron: env.NOTIFICATION_JOB_CRON,
      batchSize: env.NOTIFICATION_JOB_BATCH_SIZE,
      maxRetries: env.NOTIFICATION_JOB_MAX_RETRIES,
      cleanupDays: env.NOTIFICATION_CLEANUP_DAYS,
    });
  },

  /** Stop the scheduled notification job. */
  stop(): void {
    if (task) {
      task.stop();
      task = null;
      logger.info('Notification job stopped');
    }
  },

  /** Peek at the next notification in the queue without removing it. */
  async peek() {
    return notificationQueue.peek();
  },

  /** Clear the entire queue (use with caution). */
  async clearQueue(): Promise<void> {
    await notificationQueue.clear();
    logger.warn('Notification queue cleared');
  },

  /** Clear the dead letter queue (use with caution). */
  async clearDLQ(): Promise<void> {
    await notificationQueue.clearDLQ();
    logger.warn('Notification DLQ cleared');
  },
};
