import { registerUserEventHandlers } from './handlers/user.handler';
import { registerTaskEventHandlers } from './handlers/task.handler';
import { registerProjectEventHandlers } from './handlers/project.handler';
import { logger } from '../config/logger';

let initialized = false;

/**
 * Register all application event handlers.
 *
 * Call this once during app bootstrap (after services are connected).
 * It is safe to call multiple times — subsequent calls are no-ops.
 */
export const initializeEventBus = (): void => {
  if (initialized) {
    logger.warn('Event bus already initialized');
    return;
  }

  registerUserEventHandlers();
  registerTaskEventHandlers();
  registerProjectEventHandlers();

  initialized = true;
  logger.info('Event bus initialized');
};
