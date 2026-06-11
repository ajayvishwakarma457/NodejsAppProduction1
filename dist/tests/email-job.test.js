"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const email_job_1 = require("../jobs/email.job");
const redis_service_1 = require("../services/redis.service");
(0, vitest_1.describe)('emailJob', () => {
    const sampleEmail = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Hello world',
    };
    (0, vitest_1.beforeAll)(async () => {
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.beforeEach)(async () => {
        await email_job_1.emailJob.clearQueue();
        await email_job_1.emailJob.clearDLQ();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
    });
    (0, vitest_1.it)('should enqueue an email', async () => {
        await email_job_1.emailJob.enqueue(sampleEmail);
        const stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should process a batch and succeed', async () => {
        await email_job_1.emailJob.enqueue(sampleEmail);
        const result = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(result.processed).toBe(1);
        (0, vitest_1.expect)(result.succeeded).toBe(1);
        (0, vitest_1.expect)(result.failed).toBe(0);
        const stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
    });
    (0, vitest_1.it)('should retry failed emails up to max retries', async () => {
        // Queue an email with invalid recipient to force failure
        await email_job_1.emailJob.enqueue({ to: '', subject: 'Bad', text: 'test' });
        // First attempt fails and requeues (retries: 0 -> 1)
        const r1 = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(r1.failed).toBe(1);
        (0, vitest_1.expect)(r1.movedToDLQ).toBe(0);
        // Second attempt fails and requeues (retries: 1 -> 2)
        const r2 = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(r2.failed).toBe(1);
        (0, vitest_1.expect)(r2.movedToDLQ).toBe(0);
        // Third attempt fails and requeues (retries: 2 -> 3)
        const r3 = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(r3.failed).toBe(1);
        (0, vitest_1.expect)(r3.movedToDLQ).toBe(0);
        // Fourth attempt fails and moves to DLQ (retries: 3 -> 4 > maxRetries 3)
        const r4 = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(r4.failed).toBe(1);
        (0, vitest_1.expect)(r4.movedToDLQ).toBe(1);
        const stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
        (0, vitest_1.expect)(stats.dlqSize).toBe(1);
    });
    (0, vitest_1.it)('should process multiple emails in a batch', async () => {
        await email_job_1.emailJob.enqueue({ to: 'a@example.com', subject: 'A', text: 'a' });
        await email_job_1.emailJob.enqueue({ to: 'b@example.com', subject: 'B', text: 'b' });
        await email_job_1.emailJob.enqueue({ to: 'c@example.com', subject: 'C', text: 'c' });
        const result = await email_job_1.emailJob.processBatch();
        (0, vitest_1.expect)(result.processed).toBe(3);
        (0, vitest_1.expect)(result.succeeded).toBe(3);
    });
    (0, vitest_1.it)('should peek at the next email without removing it', async () => {
        await email_job_1.emailJob.enqueue(sampleEmail);
        const peeked = await email_job_1.emailJob.peek();
        (0, vitest_1.expect)(peeked).not.toBeNull();
        (0, vitest_1.expect)(peeked?.payload.subject).toBe('Test Subject');
        const stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should clear queue and dlq', async () => {
        // Use invalid email to force DLQ
        await email_job_1.emailJob.enqueue({ to: '', subject: 'F', text: 't' });
        await email_job_1.emailJob.processBatch(); // fail -> retry 1
        await email_job_1.emailJob.processBatch(); // fail -> retry 2
        await email_job_1.emailJob.processBatch(); // fail -> retry 3
        await email_job_1.emailJob.processBatch(); // fail -> DLQ
        let stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.dlqSize).toBe(1);
        await email_job_1.emailJob.clearQueue();
        await email_job_1.emailJob.clearDLQ();
        stats = await email_job_1.emailJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
        (0, vitest_1.expect)(stats.dlqSize).toBe(0);
    });
});
//# sourceMappingURL=email-job.test.js.map