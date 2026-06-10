import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { reminderJob } from '../jobs/reminder.job';
import { redisService } from '../services/redis.service';
import { taskService } from '../modules/tasks/task.service';
import { TaskModel } from '../modules/tasks/task.model';
import { UserModel } from '../modules/users/user.model';
import { db } from '../config/db';
import { Types } from 'mongoose';

describe('reminderJob', () => {
  let userId: string;
  let userEmail: string;

  const createUser = async () => {
    const user = await UserModel.create({
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
    });
    userId = (user as unknown as { _id: Types.ObjectId })._id.toString();
    userEmail = user.email;
    return { userId, userEmail };
  };

  const createTask = async (dueDate: Date, title = 'Test Task') => {
    const task = await TaskModel.create({
      title,
      description: 'Test description',
      projectId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(userId),
      assignedTo: new Types.ObjectId(userId),
      dueDate,
      status: 'todo',
    });
    return (task as unknown as { _id: Types.ObjectId })._id.toString();
  };

  beforeAll(async () => {
    await db.connect();
    await redisService.connect();
  });

  beforeEach(async () => {
    await reminderJob.clearQueue();
    await reminderJob.clearDLQ();
    await TaskModel.deleteMany({});
    await UserModel.deleteMany({ email: { $regex: /@example\.com$/ } });
    await createUser();
  });

  afterAll(async () => {
    await redisService.disconnect();
    await db.disconnect();
  });

  it('should scan and enqueue reminders for upcoming tasks', async () => {
    const dueDate = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now (matches only 15m window)
    await createTask(dueDate);

    const result = await reminderJob.scan();
    expect(result.enqueued).toBe(1);
    expect(result.skipped).toBe(0);

    const stats = await reminderJob.stats();
    expect(stats.queueSize).toBe(1);
  });

  it('should skip tasks that already have reminders sent', async () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000);
    await createTask(dueDate);

    const r1 = await reminderJob.scan();
    expect(r1.enqueued).toBe(1);

    const r2 = await reminderJob.scan();
    expect(r2.enqueued).toBe(0);
    expect(r2.skipped).toBe(1);
  });

  it('should scan and enqueue overdue reminders', async () => {
    const dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const taskId = await createTask(dueDate);

    // Verify the task exists and is findable as overdue
    const overdueTasks = await taskService.findOverdue(new Date());
    expect(overdueTasks.length).toBeGreaterThan(0);

    const result = await reminderJob.scan();
    expect(result.enqueued).toBe(1);
    expect(result.skipped).toBe(0);

    const peeked = await reminderJob.stats();
    expect(peeked.queueSize).toBe(1);
  });

  it('should not enqueue done tasks', async () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000);
    await TaskModel.create({
      title: 'Done Task',
      description: 'Test',
      projectId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(userId),
      assignedTo: new Types.ObjectId(userId),
      dueDate,
      status: 'done',
    });

    const result = await reminderJob.scan();
    expect(result.enqueued).toBe(0);
  });

  it('should process a batch of reminders', async () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000);
    await createTask(dueDate);
    await reminderJob.scan();

    const result = await reminderJob.processBatch();
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const stats = await reminderJob.stats();
    expect(stats.queueSize).toBe(0);
  });

  it('should move failed reminders to DLQ after retry', async () => {
    // Manually inject a bad reminder (missing email)
    const { createQueue } = await import('../utils/queue');
    const q = createQueue<{
      taskId: string;
      userId: string;
      email: string;
      taskTitle: string;
      dueDate: string;
      reminderType: string;
    }>('reminder');
    await q.enqueue({
      taskId: 'bad-task',
      userId: 'bad-user',
      email: 'invalid', // Will cause email validation to fail
      taskTitle: 'Bad',
      dueDate: new Date().toISOString(),
      reminderType: '60m',
    });

    // First attempt fails and requeues
    const r1 = await reminderJob.processBatch();
    expect(r1.failed).toBe(1);
    expect(r1.movedToDLQ).toBe(0);

    // Second attempt moves to DLQ
    const r2 = await reminderJob.processBatch();
    expect(r2.failed).toBe(1);
    expect(r2.movedToDLQ).toBe(1);

    const stats = await reminderJob.stats();
    expect(stats.dlqSize).toBe(1);
  });

  it('should clear queue and dlq', async () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000);
    await createTask(dueDate);
    await reminderJob.scan();

    let stats = await reminderJob.stats();
    expect(stats.queueSize).toBe(1);

    await reminderJob.clearQueue();
    await reminderJob.clearDLQ();

    stats = await reminderJob.stats();
    expect(stats.queueSize).toBe(0);
    expect(stats.dlqSize).toBe(0);
  });
});
