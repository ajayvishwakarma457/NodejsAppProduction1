import { Server } from 'socket.io';
import { logger } from '../../config/logger';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } from '../../utils/constants';
import { parseSocketUser } from '../auth';
import { registerNotificationSocket } from '../notification.socket';

export const initializeNotificationsNamespace = (io: Server): void => {
  const namespace = io.of('/notifications');

  namespace.on('connection', (socket) => {
    logger.info('Socket connected to /notifications namespace', { socketId: socket.id });

    const user = parseSocketUser(socket);
    if (!user) {
      logger.warn('/notifications connection rejected: invalid or missing auth token', {
        socketId: socket.id,
      });
      socket.emit(SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
      socket.disconnect(true);
      return;
    }

    socket.user = user;

    // Join a per-user room so the server can push notifications to this user.
    const room = `${SOCKET_ROOM_PREFIX.notification}${user.id}`;
    socket.join(room);

    registerNotificationSocket(socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected from /notifications namespace', {
        socketId: socket.id,
        reason,
      });
    });
  });
};
