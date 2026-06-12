"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskEventHandlers = void 0;
const mongoose_1 = require("mongoose");
const event_bus_1 = require("../../utils/event-bus");
const notification_service_1 = require("../../modules/notifications/notification.service");
const notification_job_1 = require("../../jobs/notification.job");
const logger_1 = require("../../config/logger");
const registerTaskEventHandlers = () => {
    event_bus_1.eventBus.on('task.created', ({ taskId, createdBy }) => {
        logger_1.logger.info('Event received: task.created', { taskId, createdBy });
    });
    event_bus_1.eventBus.on('task.assigned', async ({ taskId, userId, title, assignedBy }) => {
        logger_1.logger.info('Event received: task.assigned', { taskId, userId, title, assignedBy });
        const notification = await notification_service_1.notificationService.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            title: 'New task assigned',
            message: `You have been assigned to "${title}".`,
            type: 'task-assigned',
            channels: ['in-app'],
            status: 'pending',
        });
        await notification_job_1.notificationJob.enqueue({
            notificationId: notification._id.toString(),
            userId,
            title: 'New task assigned',
            message: `You have been assigned to "${title}".`,
            channels: ['in-app'],
            type: 'task-assigned',
        });
    });
};
exports.registerTaskEventHandlers = registerTaskEventHandlers;
//# sourceMappingURL=task.handler.js.map