import { Server } from 'socket.io';
import { logger } from '../../config/logger';
import { initializeTasksNamespace } from './tasks.namespace';
import { initializeTeamsNamespace } from './teams.namespace';
import { initializeNotificationsNamespace } from './notifications.namespace';

/**
 * Register all Socket.IO namespaces.
 *
 * This is additive to the default namespace registered in `sockets/index.ts`.
 */
export const initializeNamespaces = (io: Server): void => {
  initializeTasksNamespace(io);
  initializeTeamsNamespace(io);
  initializeNotificationsNamespace(io);

  logger.info('Socket.IO namespaces initialized');
};
