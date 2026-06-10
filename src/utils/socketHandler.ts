import { Socket } from 'socket.io';
import { logger } from '../config/logger';

export const socketHandler = <T extends unknown[]>(
  socket: Socket,
  event: string,
  handler: (...args: T) => void | Promise<void>
) => {
  socket.on(event, (...args: T) => {
    try {
      const result = handler(...args);
      if (result instanceof Promise) {
        void result.catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error(`Socket event "${event}" failed`, {
            socketId: socket.id,
            error: error.message,
          });
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Socket event "${event}" failed`, {
        socketId: socket.id,
        error: error.message,
      });
    }
  });
};
