"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportQueue = void 0;
const bullmq_service_1 = require("../services/bullmq.service");
const logger_1 = require("../config/logger");
const processor = async (job) => {
    const { reportType, userId, filters, email } = job.data;
    logger_1.logger.info('Generating report', {
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
exports.reportQueue = {
    /** Register the report queue and its worker. */
    initialize() {
        return (0, bullmq_service_1.createBullQueue)({
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
    async enqueue(payload, options) {
        const queue = (0, bullmq_service_1.getBullQueue)(REPORT_QUEUE_NAME);
        return queue.add('generate', payload, {
            jobId: options?.jobId,
            delay: options?.delay,
            priority: options?.priority,
        });
    },
    /** Get the BullMQ queue instance. */
    getQueue() {
        return (0, bullmq_service_1.getBullQueue)(REPORT_QUEUE_NAME);
    },
};
//# sourceMappingURL=report.job.js.map