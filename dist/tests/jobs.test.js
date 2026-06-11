"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jobs_1 = require("../jobs");
const redis_service_1 = require("../services/redis.service");
const db_1 = require("../config/db");
(0, vitest_1.describe)('jobOrchestrator', () => {
    (0, vitest_1.beforeAll)(async () => {
        await db_1.db.connect();
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.beforeEach)(async () => {
        await jobs_1.emailJob.clearQueue();
        await jobs_1.emailJob.clearDLQ();
        await jobs_1.notificationJob.clearQueue();
        await jobs_1.notificationJob.clearDLQ();
        await jobs_1.reminderJob.clearQueue();
        await jobs_1.reminderJob.clearDLQ();
    });
    (0, vitest_1.afterAll)(async () => {
        jobs_1.jobOrchestrator.stopAll();
        await redis_service_1.redisService.disconnect();
        await db_1.db.disconnect();
    });
    (0, vitest_1.it)('should return health stats for all jobs', async () => {
        const health = await jobs_1.jobOrchestrator.health();
        (0, vitest_1.expect)(health).toHaveLength(3);
        (0, vitest_1.expect)(health.map((h) => h.name)).toEqual(vitest_1.expect.arrayContaining(['email', 'notification', 'reminder']));
        for (const entry of health) {
            (0, vitest_1.expect)(entry).toHaveProperty('queueSize');
            (0, vitest_1.expect)(entry).toHaveProperty('dlqSize');
            (0, vitest_1.expect)(typeof entry.queueSize).toBe('number');
            (0, vitest_1.expect)(typeof entry.dlqSize).toBe('number');
        }
    });
    (0, vitest_1.it)('should start and stop all jobs without crashing', () => {
        // Jobs are disabled by default in test env, so startAll should log but not crash
        (0, vitest_1.expect)(() => jobs_1.jobOrchestrator.startAll()).not.toThrow();
        (0, vitest_1.expect)(() => jobs_1.jobOrchestrator.stopAll()).not.toThrow();
    });
    (0, vitest_1.it)('should reflect queue changes in health stats', async () => {
        await jobs_1.emailJob.enqueue({
            to: 'a@example.com',
            subject: 'Test',
            text: 'Hello',
        });
        const health = await jobs_1.jobOrchestrator.health();
        const emailHealth = health.find((h) => h.name === 'email');
        (0, vitest_1.expect)(emailHealth?.queueSize).toBe(1);
    });
});
//# sourceMappingURL=jobs.test.js.map