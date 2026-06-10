import { Socket } from 'socket.io';
import { logger } from '../config/logger';
import { notificationService } from '../modules/notifications/notification.service';
import { SOCKET_EVENTS } from '../utils/constants';
import { isValidId } from '../utils/helpers';
import { socketHandler } from '../utils/socketHandler';

export const registerNotificationSocket = (socket: Socket) => {
  socketHandler(socket, SOCKET_EVENTS.notification.read, async (notificationId: unknown) => {
    if (!isValidId(notificationId)) {
      logger.warn('Invalid notification:read payload', { socketId: socket.id, notificationId });
      socket.emit(SOCKET_EVENTS.notification.error, { message: 'Invalid notificationId' });
      return;
    }

    const userId = socket.user?.id;
    if (!userId) {
      logger.warn('notification:read rejected: missing user context', { socketId: socket.id });
      socket.emit(SOCKET_EVENTS.notification.error, { message: 'Unauthorized' });
      return;
    }

    const updated = await notificationService.markAsRead(notificationId, userId);

    if (!updated) {
      logger.warn('notification:read rejected: not found or already read', {
        socketId: socket.id,
        notificationId,
        userId,
      });
      socket.emit(SOCKET_EVENTS.notification.error, {
        message: 'Notification not found or already read',
      });
      return;
    }

    socket.emit(SOCKET_EVENTS.notification.ack, { notificationId });
    logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
  });
};
