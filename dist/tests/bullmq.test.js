"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redis_service_1 = require("../services/redis.service");
const report_job_1 = require("../jobs/report.job");
const bullmq_service_1 = require("../services/bullmq.service");
(0, vitest_1.describe)('BullMQ report queue', () => {
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
        report_job_1.reportQueue.initialize();
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, bullmq_service_1.closeAllBullQueues)();
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should enqueue a report generation job', async () => {
        const queue = report_job_1.reportQueue.getQueue();
        const worker = (0, bullmq_service_1.getBullWorker)('report-generation');
        await worker?.pause();
        await queue.obliterate({ force: true });
        const job = await report_job_1.reportQueue.enqueue({
            reportType: 'projects',
            userId: 'user-123',
            filters: { status: 'active' },
        });
        (0, vitest_1.expect)(job.id).toBeDefined();
        (0, vitest_1.expect)(job.data.reportType).toBe('projects');
        (0, vitest_1.expect)(job.data.userId).toBe('user-123');
        const waiting = await queue.getWaitingCount();
        (0, vitest_1.expect)(waiting).toBe(1);
        await worker?.resume();
    });
    (0, vitest_1.it)('should enqueue a delayed report job', async () => {
        const queue = report_job_1.reportQueue.getQueue();
        await queue.obliterate({ force: true });
        const job = await report_job_1.reportQueue.enqueue({ reportType: 'tasks', userId: 'user-456' }, { delay: 10000 });
        (0, vitest_1.expect)(job.delay).toBe(10000);
        const delayed = await queue.getDelayedCount();
        (0, vitest_1.expect)(delayed).toBe(1);
    });
    (0, vitest_1.it)('should deduplicate jobs with the same jobId', async () => {
        const queue = report_job_1.reportQueue.getQueue();
        await queue.obliterate({ force: true });
        const job1 = await report_job_1.reportQueue.enqueue({ reportType: 'users', userId: 'user-789' }, { jobId: 'unique-report-1' });
        const job2 = await report_job_1.reportQueue.enqueue({ reportType: 'users', userId: 'user-789' }, { jobId: 'unique-report-1' });
        (0, vitest_1.expect)(job1.id).toBe(job2.id);
    });
    (0, vitest_1.it)('should return queue stats', async () => {
        const queue = report_job_1.reportQueue.getQueue();
        const worker = (0, bullmq_service_1.getBullWorker)('report-generation');
        await worker?.pause();
        await queue.obliterate({ force: true });
        await report_job_1.reportQueue.enqueue({ reportType: 'projects', userId: 'user-stats' });
        const stats = await (0, bullmq_service_1.getBullQueueStats)();
        const reportStats = stats.find((s) => s.name === 'report-generation');
        (0, vitest_1.expect)(reportStats).toBeDefined();
        (0, vitest_1.expect)(reportStats.waiting).toBe(1);
        await worker?.resume();
    });
});
//# sourceMappingURL=bullmq.test.js.map