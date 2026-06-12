import * as cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { emailService, SendEmailOptions } from '../services/email.service';
import { createLockedCronHandler } from '../utils/distributed-lock';
import { createQueue } from '../utils/queue';

export interface EmailQueuePayload extends SendEmailOptions {
  metadata?: Record<string, unknown>;
}

const emailQueue = createQueue<EmailQueuePayload>('email');

let task: cron.ScheduledTask | null = null;

const processEmail = async (
  payload: EmailQueuePayload
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const result = await emailService.send(payload);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
};

export const emailJob = {
  /** Enqueue an email to be sent by the background job. */
  async enqueue(payload: EmailQueuePayload): Promise<void> {
    await emailQueue.enqueue(payload);
    logger.debug('Email enqueued', {
      to: payload.to,
      subject: payload.subject,
    });
  },

  /** Process a single batch of queued emails. */
  async processBatch(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    movedToDLQ: number;
  }> {
    const batchSize = env.EMAIL_JOB_BATCH_SIZE;
    const maxRetries = env.EMAIL_JOB_MAX_RETRIES;
    const items = await emailQueue.dequeueBatch(batchSize);

    let succeeded = 0;
    let failed = 0;
    let movedToDLQ = 0;

    for (const item of items) {
      const result = await processEmail(item.payload);

      if (result.success) {
        succeeded++;
        logger.info('Email job sent successfully', {
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
        logger.warn('Email job failed, requeued for retry', {
          id: item.id,
          to: item.payload.to,
          retries: item.retries,
          error: result.error,
        });
      } else {
        await emailQueue.moveToDLQ(item);
        movedToDLQ++;
        logger.error('Email job failed permanently, moved to DLQ', {
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
  async stats(): Promise<{ queueSize: number; dlqSize: number }> {
    const [queueSize, dlqSize] = await Promise.all([emailQueue.size(), emailQueue.dlqSize()]);
    return { queueSize, dlqSize };
  },

  /** Start the scheduled email job. */
  start(): void {
    if (task) {
      logger.warn('Email job already running');
      return;
    }

    if (!env.EMAIL_JOB_ENABLED) {
      logger.info('Email job is disabled (EMAIL_JOB_ENABLED=false)');
      return;
    }

    if (!cron.validate(env.EMAIL_JOB_CRON)) {
      logger.error('Invalid email job cron expression', {
        cron: env.EMAIL_JOB_CRON,
      });
      return;
    }

    const lockedProcessBatch = createLockedCronHandler('email-job', () => this.processBatch());

    task = cron.schedule(env.EMAIL_JOB_CRON, async () => {
      try {
        logger.debug('Email job batch starting');
        const result = await lockedProcessBatch();

        if (result && result.processed > 0) {
          logger.info('Email job batch completed', result);
        }
      } catch (error) {
        logger.error('Email job batch crashed', {
          error: error instanceof Error ? error.message : error,
        });
      }
    });

    logger.info('Email job started', {
      cron: env.EMAIL_JOB_CRON,
      batchSize: env.EMAIL_JOB_BATCH_SIZE,
      maxRetries: env.EMAIL_JOB_MAX_RETRIES,
    });
  },

  /** Stop the scheduled email job. */
  stop(): void {
    if (task) {
      task.stop();
      task = null;
      logger.info('Email job stopped');
    }
  },

  /** Peek at the next email in the queue without removing it. */
  async peek() {
    return emailQueue.peek();
  },

  /** Clear the entire queue (use with caution). */
  async clearQueue(): Promise<void> {
    await emailQueue.clear();
    logger.warn('Email queue cleared');
  },

  /** Clear the dead letter queue (use with caution). */
  async clearDLQ(): Promise<void> {
    await emailQueue.clearDLQ();
    logger.warn('Email DLQ cleared');
  },
};
