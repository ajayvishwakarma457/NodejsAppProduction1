import { Types } from 'mongoose';
import { eventBus } from '../../utils/event-bus';
import { notificationService } from '../../modules/notifications/notification.service';
import { NotificationDocument } from '../../modules/notifications/notification.model';
import { notificationJob } from '../../jobs/notification.job';
import { logger } from '../../config/logger';

export const registerTaskEventHandlers = (): void => {
  eventBus.on('task.created', ({ taskId, createdBy }) => {
    logger.info('Event received: task.created', { taskId, createdBy });
  });

  eventBus.on('task.assigned', async ({ taskId, userId, title, assignedBy }) => {
    logger.info('Event received: task.assigned', { taskId, userId, title, assignedBy });

    const notification = await notificationService.create({
      userId: new Types.ObjectId(userId),
      title: 'New task assigned',
      message: `You have been assigned to "${title}".`,
      type: 'task-assigned',
      channels: ['in-app'],
      status: 'pending',
    });

    await notificationJob.enqueue({
      notificationId: (notification as NotificationDocument)._id.toString(),
      userId,
      title: 'New task assigned',
      message: `You have been assigned to "${title}".`,
      channels: ['in-app'],
      type: 'task-assigned',
    });
  });
};
