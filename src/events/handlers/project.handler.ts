import { eventBus } from '../../utils/event-bus';
import { logger } from '../../config/logger';

export const registerProjectEventHandlers = (): void => {
  eventBus.on('project.created', ({ projectId, ownerId, name }) => {
    logger.info('Event received: project.created', { projectId, ownerId, name });
  });
};
