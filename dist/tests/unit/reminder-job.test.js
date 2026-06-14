"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const reminder_job_1 = require("../../jobs/reminder.job");
const redis_service_1 = require("../../services/redis.service");
const task_service_1 = require("../../modules/tasks/task.service");
const task_model_1 = require("../../modules/tasks/task.model");
const user_model_1 = require("../../modules/users/user.model");
const db_1 = require("../../config/db");
const mongoose_1 = require("mongoose");
(0, vitest_1.describe)('reminderJob', () => {
    let userId;
    let userEmail;
    const createUser = async () => {
        const user = await user_model_1.UserModel.create({
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@example.com`,
            password: 'password123',
        });
        userId = user._id.toString();
        userEmail = user.email;
        return { userId, userEmail };
    };
    const createTask = async (dueDate, title = 'Test Task') => {
        const task = await task_model_1.TaskModel.create({
            title,
            description: 'Test description',
            projectId: new mongoose_1.Types.ObjectId(),
            createdBy: new mongoose_1.Types.ObjectId(userId),
            assignedTo: new mongoose_1.Types.ObjectId(userId),
            dueDate,
            status: 'todo',
        });
        return task._id.toString();
    };
    (0, vitest_1.beforeAll)(async () => {
        await db_1.db.connect();
        await redis_service_1.redisService.connect();
    });
    (0, vitest_1.beforeEach)(async () => {
        await reminder_job_1.reminderJob.clearQueue();
        await reminder_job_1.reminderJob.clearDLQ();
        await task_model_1.TaskModel.deleteMany({});
        await user_model_1.UserModel.deleteMany({ email: { $regex: /@example\.com$/ } });
        await createUser();
    });
    (0, vitest_1.afterAll)(async () => {
        await redis_service_1.redisService.disconnect();
        await db_1.db.disconnect();
    });
    (0, vitest_1.it)('should scan and enqueue reminders for upcoming tasks', async () => {
        const dueDate = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now (matches only 15m window)
        await createTask(dueDate);
        const result = await reminder_job_1.reminderJob.scan();
        (0, vitest_1.expect)(result.enqueued).toBe(1);
        (0, vitest_1.expect)(result.skipped).toBe(0);
        const stats = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should skip tasks that already have reminders sent', async () => {
        const dueDate = new Date(Date.now() + 30 * 60 * 1000);
        await createTask(dueDate);
        const r1 = await reminder_job_1.reminderJob.scan();
        (0, vitest_1.expect)(r1.enqueued).toBe(1);
        const r2 = await reminder_job_1.reminderJob.scan();
        (0, vitest_1.expect)(r2.enqueued).toBe(0);
        (0, vitest_1.expect)(r2.skipped).toBe(1);
    });
    (0, vitest_1.it)('should scan and enqueue overdue reminders', async () => {
        const dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        const taskId = await createTask(dueDate);
        // Verify the task exists and is findable as overdue
        const overdueTasks = await task_service_1.taskService.findOverdue(new Date());
        (0, vitest_1.expect)(overdueTasks.length).toBeGreaterThan(0);
        const result = await reminder_job_1.reminderJob.scan();
        (0, vitest_1.expect)(result.enqueued).toBe(1);
        (0, vitest_1.expect)(result.skipped).toBe(0);
        const peeked = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(peeked.queueSize).toBe(1);
    });
    (0, vitest_1.it)('should not enqueue done tasks', async () => {
        const dueDate = new Date(Date.now() + 30 * 60 * 1000);
        await task_model_1.TaskModel.create({
            title: 'Done Task',
            description: 'Test',
            projectId: new mongoose_1.Types.ObjectId(),
            createdBy: new mongoose_1.Types.ObjectId(userId),
            assignedTo: new mongoose_1.Types.ObjectId(userId),
            dueDate,
            status: 'done',
        });
        const result = await reminder_job_1.reminderJob.scan();
        (0, vitest_1.expect)(result.enqueued).toBe(0);
    });
    (0, vitest_1.it)('should process a batch of reminders', async () => {
        const dueDate = new Date(Date.now() + 30 * 60 * 1000);
        await createTask(dueDate);
        await reminder_job_1.reminderJob.scan();
        const result = await reminder_job_1.reminderJob.processBatch();
        (0, vitest_1.expect)(result.processed).toBe(1);
        (0, vitest_1.expect)(result.succeeded).toBe(1);
        (0, vitest_1.expect)(result.failed).toBe(0);
        const stats = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
    });
    (0, vitest_1.it)('should move failed reminders to DLQ after retry', async () => {
        // Manually inject a bad reminder (missing email)
        const { createQueue } = await Promise.resolve().then(() => __importStar(require('../../utils/queue')));
        const q = createQueue('reminder');
        await q.enqueue({
            taskId: 'bad-task',
            userId: 'bad-user',
            email: 'invalid', // Will cause email validation to fail
            taskTitle: 'Bad',
            dueDate: new Date().toISOString(),
            reminderType: '60m',
        });
        // First attempt fails and requeues
        const r1 = await reminder_job_1.reminderJob.processBatch();
        (0, vitest_1.expect)(r1.failed).toBe(1);
        (0, vitest_1.expect)(r1.movedToDLQ).toBe(0);
        // Second attempt moves to DLQ
        const r2 = await reminder_job_1.reminderJob.processBatch();
        (0, vitest_1.expect)(r2.failed).toBe(1);
        (0, vitest_1.expect)(r2.movedToDLQ).toBe(1);
        const stats = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(stats.dlqSize).toBe(1);
    });
    (0, vitest_1.it)('should clear queue and dlq', async () => {
        const dueDate = new Date(Date.now() + 30 * 60 * 1000);
        await createTask(dueDate);
        await reminder_job_1.reminderJob.scan();
        let stats = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(1);
        await reminder_job_1.reminderJob.clearQueue();
        await reminder_job_1.reminderJob.clearDLQ();
        stats = await reminder_job_1.reminderJob.stats();
        (0, vitest_1.expect)(stats.queueSize).toBe(0);
        (0, vitest_1.expect)(stats.dlqSize).toBe(0);
    });
});
//# sourceMappingURL=reminder-job.test.js.map