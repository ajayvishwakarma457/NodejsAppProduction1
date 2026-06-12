import { Job } from 'bullmq';
import { createBullQueue, getBullQueue } from '../services/bullmq.service';
import { logger } from '../config/logger';

export interface GenerateReportPayload {
  reportType: 'projects' | 'tasks' | 'users';
  userId: string;
  filters?: Record<string, unknown>;
  email?: string;
}

const processor = async (job: Job<GenerateReportPayload>) => {
  const { reportType, userId, filters, email } = job.data;

  logger.info('Generating report', {
    jobId: job.id,
    reportType,
    userId,
    filters,
    email,
  });

  // Simulate report generation work
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In a real implementation, this would:
  // 1. Query MongoDB for the report data
  // 2. Generate a CSV/PDF/Excel file
  // 3. Upload to storage
  // 4. Send email notification if requested
  // 5. Persist report metadata

  return {
    reportId: job.id,
    status: 'completed',
    reportType,
    userId,
    generatedAt: new Date().toISOString(),
  };
};

const REPORT_QUEUE_NAME = 'report-generation';

export const reportQueue = {
  /** Register the report queue and its worker. */
  initialize(): ReturnType<typeof createBullQueue<GenerateReportPayload>> {
    return createBullQueue<GenerateReportPayload>({
      name: REPORT_QUEUE_NAME,
      processor,
      queueOptions: {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 24 * 60 * 60, count: 100 },
          removeOnFail: { age: 7 * 24 * 60 * 60, count: 50 },
        },
      },
      workerOptions: {
        concurrency: 3,
      },
    });
  },

  /** Enqueue a report generation job. */
  async enqueue(
    payload: GenerateReportPayload,
    options?: { delay?: number; jobId?: string; priority?: number }
  ) {
    const queue = getBullQueue<GenerateReportPayload>(REPORT_QUEUE_NAME);
    return queue.add('generate', payload, {
      jobId: options?.jobId,
      delay: options?.delay,
      priority: options?.priority,
    });
  },

  /** Get the BullMQ queue instance. */
  getQueue() {
    return getBullQueue<GenerateReportPayload>(REPORT_QUEUE_NAME);
  },
};
