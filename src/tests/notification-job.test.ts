import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { notificationJob, NotificationQueuePayload } from '../jobs/notification.job';
import { notificationService } from '../modules/notifications/notification.service';
import { redisService } from '../services/redis.service';
import {
  NotificationModel,
  NotificationDocument,
} from '../modules/notifications/notification.model';
import { db } from '../config/db';
import { Types } from 'mongoose';

describe('notificationJob', () => {
  let testNotificationId: string;

  const createTestNotification = async () => {
    const doc = await notificationService.create({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      title: 'Test Title',
      message: 'Test message',
      type: 'task-assigned',
      channels: ['in-app'],
      status: 'pending',
    } as Partial<NotificationDocument>);
    testNotificationId = (doc as unknown as { _id: Types.ObjectId })._id.toString();
    return testNotificationId;
  };

  const samplePayload = (id?: string): NotificationQueuePayload => ({
    notificationId: id || testNotificationId || '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439011',
    title: 'Test',
    message: 'Hello',
    channels: ['in-app'],
    type: 'task-assigned',
  });

  beforeAll(async () => {
    await db.connect();
    await redisService.connect();
  });

  beforeEach(async () => {
    await notificationJob.clearQueue();
    await notificationJob.clearDLQ();
    await NotificationModel.deleteMany({});
  });

  afterAll(async () => {
    await redisService.disconnect();
    await db.disconnect();
  });

  it('should enqueue a notification', async () => {
    await createTestNotification();
    await notificationJob.enqueue(samplePayload());
    const stats = await notificationJob.stats();
    expect(stats.queueSize).toBe(1);
  });

  it('should process a batch and mark in-app as delivered', async () => {
    const id = await createTestNotification();
    await notificationJob.enqueue(samplePayload(id));

    const result = await notificationJob.processBatch();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const updated = (await NotificationModel.findById(id).lean()) as unknown as {
      status: string;
      deliveredAt: Date | null;
    } | null;
    expect(updated?.status).toBe('delivered');
    expect(updated?.deliveredAt).not.toBeNull();
  });

  it('should retry failed notifications up to max retries', async () => {
    const id = await createTestNotification();
    // Enqueue with a bogus notificationId to force DB lookup failure
    await notificationJob.enqueue({
      notificationId: '000000000000000000000000',
      userId: '507f1f77bcf86cd799439011',
      title: 'Fail',
      message: 'Fail',
      channels: ['in-app'],
      type: 'task-assigned',
    });

    const r1 = await notificationJob.processBatch();
    expect(r1.failed).toBe(1);
    expect(r1.movedToDLQ).toBe(0);

    const r2 = await notificationJob.processBatch();
    expect(r2.failed).toBe(1);
    expect(r2.movedToDLQ).toBe(0);

    const r3 = await notificationJob.processBatch();
    expect(r3.failed).toBe(1);
    expect(r3.movedToDLQ).toBe(0);

    const r4 = await notificationJob.processBatch();
    expect(r4.failed).toBe(1);
    expect(r4.movedToDLQ).toBe(1);

    const stats = await notificationJob.stats();
    expect(stats.queueSize).toBe(0);
    expect(stats.dlqSize).toBe(1);
  });

  it('should process multiple notifications in a batch', async () => {
    const id1 = await createTestNotification();
    const id2 = await createTestNotification();
    const id3 = await createTestNotification();

    await notificationJob.enqueue(samplePayload(id1));
    await notificationJob.enqueue(samplePayload(id2));
    await notificationJob.enqueue(samplePayload(id3));

    const result = await notificationJob.processBatch();
    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
  });

  it('should peek at the next notification without removing it', async () => {
    await createTestNotification();
    await notificationJob.enqueue(samplePayload());
    const peeked = await notificationJob.peek();

    expect(peeked).not.toBeNull();
    expect(peeked?.payload.title).toBe('Test');

    const stats = await notificationJob.stats();
    expect(stats.queueSize).toBe(1);
  });

  it('should clean up old read notifications', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);

    await NotificationModel.create({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      title: 'Old',
      message: 'Old msg',
      type: 'task-assigned',
      isRead: true,
      status: 'delivered',
      createdAt: oldDate,
    } as unknown as NotificationDocument);

    const result = await notificationJob.cleanup();
    expect(result.deleted).toBe(1);
  });

  it('should not clean up unread notifications', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);

    await NotificationModel.create({
      userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      title: 'Old Unread',
      message: 'Old msg',
      type: 'task-assigned',
      isRead: false,
      status: 'pending',
      createdAt: oldDate,
    } as unknown as NotificationDocument);

    const result = await notificationJob.cleanup();
    expect(result.deleted).toBe(0);
  });

  it('should clear queue and dlq', async () => {
    await notificationJob.enqueue({
      notificationId: '000000000000000000000000',
      userId: '507f1f77bcf86cd799439011',
      title: 'Fail',
      message: 'Fail',
      channels: ['in-app'],
      type: 'task-assigned',
    });

    await notificationJob.processBatch();
    await notificationJob.processBatch();
    await notificationJob.processBatch();
    await notificationJob.processBatch();

    let stats = await notificationJob.stats();
    expect(stats.dlqSize).toBe(1);

    await notificationJob.clearQueue();
    await notificationJob.clearDLQ();

    stats = await notificationJob.stats();
    expect(stats.queueSize).toBe(0);
    expect(stats.dlqSize).toBe(0);
  });
});
