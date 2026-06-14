"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const notification_job_1 = require("../../jobs/notification.job");
const notification_service_1 = require("../../modules/notifications/notification.service");
const redis_service_1 = require("../../services/redis.service");
const notification_model_1 = require("../../modules/notifications/notification.model");
const db_1 = require("../../config/db");
const mongoose_1 = require("mongoose");
(0, vitest_1.describe)('notificationJob', () => {
    let testNotificationId;
    const createTestNotification = async () => {
        const doc = await notification_service_1.notificationService.create({
            userId: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439011'),
            title: 'Test Title',
            message: 'Test message',
            type: 'task-assigned',
            channels: ['in-app'],
            status: 'pending',
        });
        testNotificationId = doc?.id ? String(doc.id) : '';
        return testNotificationId;
    };
    const samplePayload = (id) => ({
        notificationId: id || testNotificationId || '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        title: 'Test',
        message: 'Hello',
        channels: ['in-app'],
        type: 'task-assigned',
    });
    (0, vitest_1.beforeAll)(async () => {
        await db_1.db.connect();
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.beforeEach)(async () => {
        await notification_job_1.notificationJob.clearQueue();
        await notification_job_1.notificationJob.clearDLQ();
        await notification_model_1.NotificationModel.deleteMany({});
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
        await db_1.db.disconnect();
    });
    (0, vitest_1.it)('should enqueue a notification', async () => {
        await createTestNotification();
        await notification_job_1.notificationJob.enqueue(samplePayload());
        const stats = await notification_job_1.notificationJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should process a batch and mark in-app as delivered', async () => {
        const id = await createTestNotification();
        await notification_job_1.notificationJob.enqueue(samplePayload(id));
        const result = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(result.processed).toBe(1);
        (0, vitest_1.expect)(result.succeeded).toBe(1);
        (0, vitest_1.expect)(result.failed).toBe(0);
        const updated = (await notification_model_1.NotificationModel.findById(id).lean());
        (0, vitest_1.expect)(updated?.status).toBe('delivered');
        (0, vitest_1.expect)(updated?.deliveredAt).not.toBeNull();
    });
    (0, vitest_1.it)('should retry failed notifications up to max retries', async () => {
        const id = await createTestNotification();
        // Enqueue with a bogus notificationId to force DB lookup failure
        await notification_job_1.notificationJob.enqueue({
            notificationId: '000000000000000000000000',
            userId: '507f1f77bcf86cd799439011',
            title: 'Fail',
            message: 'Fail',
            channels: ['in-app'],
            type: 'task-assigned',
        });
        const r1 = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(r1.failed).toBe(1);
        (0, vitest_1.expect)(r1.movedToDLQ).toBe(0);
        const r2 = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(r2.failed).toBe(1);
        (0, vitest_1.expect)(r2.movedToDLQ).toBe(0);
        const r3 = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(r3.failed).toBe(1);
        (0, vitest_1.expect)(r3.movedToDLQ).toBe(0);
        const r4 = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(r4.failed).toBe(1);
        (0, vitest_1.expect)(r4.movedToDLQ).toBe(1);
        const stats = await notification_job_1.notificationJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
        (0, vitest_1.expect)(stats.dlqSize).toBe(1);
    });
    (0, vitest_1.it)('should process multiple notifications in a batch', async () => {
        const id1 = await createTestNotification();
        const id2 = await createTestNotification();
        const id3 = await createTestNotification();
        await notification_job_1.notificationJob.enqueue(samplePayload(id1));
        await notification_job_1.notificationJob.enqueue(samplePayload(id2));
        await notification_job_1.notificationJob.enqueue(samplePayload(id3));
        const result = await notification_job_1.notificationJob.processBatch();
        (0, vitest_1.expect)(result.processed).toBe(3);
        (0, vitest_1.expect)(result.succeeded).toBe(3);
    });
    (0, vitest_1.it)('should peek at the next notification without removing it', async () => {
        await createTestNotification();
        await notification_job_1.notificationJob.enqueue(samplePayload());
        const peeked = await notification_job_1.notificationJob.peek();
        (0, vitest_1.expect)(peeked).not.toBeNull();
        (0, vitest_1.expect)(peeked?.payload.title).toBe('Test');
        const stats = await notification_job_1.notificationJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should clean up old read notifications', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40);
        await notification_model_1.NotificationModel.create({
            userId: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439011'),
            title: 'Old',
            message: 'Old msg',
            type: 'task-assigned',
            isRead: true,
            status: 'delivered',
            createdAt: oldDate,
        });
        const result = await notification_job_1.notificationJob.cleanup();
        (0, vitest_1.expect)(result.deleted).toBe(1);
    });
    (0, vitest_1.it)('should not clean up unread notifications', async () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40);
        await notification_model_1.NotificationModel.create({
            userId: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439011'),
            title: 'Old Unread',
            message: 'Old msg',
            type: 'task-assigned',
            isRead: false,
            status: 'pending',
            createdAt: oldDate,
        });
        const result = await notification_job_1.notificationJob.cleanup();
        (0, vitest_1.expect)(result.deleted).toBe(0);
    });
    (0, vitest_1.it)('should clear queue and dlq', async () => {
        await notification_job_1.notificationJob.enqueue({
            notificationId: '000000000000000000000000',
            userId: '507f1f77bcf86cd799439011',
            title: 'Fail',
            message: 'Fail',
            channels: ['in-app'],
            type: 'task-assigned',
        });
        await notification_job_1.notificationJob.processBatch();
        await notification_job_1.notificationJob.processBatch();
        await notification_job_1.notificationJob.processBatch();
        await notification_job_1.notificationJob.processBatch();
        let stats = await notification_job_1.notificationJob.stats();
        (0, vitest_1.expect)(stats.dlqSize).toBe(1);
        await notification_job_1.notificationJob.clearQueue();
        await notification_job_1.notificationJob.clearDLQ();
        stats = await notification_job_1.notificationJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
        (0, vitest_1.expect)(stats.dlqSize).toBe(0);
    });
});
//# sourceMappingURL=notification-job.test.js.map