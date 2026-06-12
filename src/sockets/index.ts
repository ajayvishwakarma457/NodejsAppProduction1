import { Server } from 'socket.io';
import { logger } from '../config/logger';
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } from '../utils/constants';
import { parseSocketUser } from './auth';
import { registerNotificationSocket } from './notification.socket';
import { registerTaskSocket } from './task.socket';
import { registerTeamSocket } from './team.socket';

export const registerSockets = (io: Server) => {
  io.on('connection', (socket) => {
    try {
      logger.info('Socket connected', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });

      const user = parseSocketUser(socket);
      if (!user) {
        logger.warn('Socket connection rejected: invalid or missing auth token', {
          socketId: socket.id,
        });
        socket.emit(SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
        socket.disconnect(true);
        return;
      }

      socket.user = user;

      // Join a per-user notification room on the default namespace so push
      // notifications can be delivered over the existing socket connection.
      socket.join(`${SOCKET_ROOM_PREFIX.notification}${user.id}`);

      registerTaskSocket(io, socket);
      registerNotificationSocket(socket);
      registerTeamSocket(io, socket);

      socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected', {
          socketId: socket.id,
          reason,
        });
      });

      socket.on('error', (err) => {
        logger.error('Socket error', {
          socketId: socket.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Unhandled error in socket connection handler', {
        socketId: socket.id,
        error: error.message,
      });
      socket.disconnect(true);
    }
  });
};
