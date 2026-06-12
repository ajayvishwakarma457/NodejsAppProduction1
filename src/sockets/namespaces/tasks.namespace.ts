import { Server } from 'socket.io';
import { logger } from '../../config/logger';
import { SOCKET_EVENTS } from '../../utils/constants';
import { parseSocketUser } from '../auth';
import { registerTaskSocket } from '../task.socket';

export const initializeTasksNamespace = (io: Server): void => {
  const namespace = io.of('/tasks');

  namespace.on('connection', (socket) => {
    logger.info('Socket connected to /tasks namespace', { socketId: socket.id });

    const user = parseSocketUser(socket);
    if (!user) {
      logger.warn('/tasks connection rejected: invalid or missing auth token', {
        socketId: socket.id,
      });
      socket.emit(SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
      socket.disconnect(true);
      return;
    }

    socket.user = user;
    registerTaskSocket(namespace, socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected from /tasks namespace', {
        socketId: socket.id,
        reason,
      });
    });
  });
};
