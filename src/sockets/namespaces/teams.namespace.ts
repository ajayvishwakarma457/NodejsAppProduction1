import { Server } from 'socket.io';
import { logger } from '../../config/logger';
import { SOCKET_EVENTS } from '../../utils/constants';
import { parseSocketUser } from '../auth';
import { registerTeamSocket } from '../team.socket';

export const initializeTeamsNamespace = (io: Server): void => {
  const namespace = io.of('/teams');

  namespace.on('connection', (socket) => {
    logger.info('Socket connected to /teams namespace', { socketId: socket.id });

    const user = parseSocketUser(socket);
    if (!user) {
      logger.warn('/teams connection rejected: invalid or missing auth token', {
        socketId: socket.id,
      });
      socket.emit(SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
      socket.disconnect(true);
      return;
    }

    socket.user = user;
    registerTeamSocket(namespace, socket);

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected from /teams namespace', {
        socketId: socket.id,
        reason,
      });
    });
  });
};
