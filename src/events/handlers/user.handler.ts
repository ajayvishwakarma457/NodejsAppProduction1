import { eventBus } from '../../utils/event-bus';
import { emailJob } from '../../jobs/email.job';
import { logger } from '../../config/logger';

export const registerUserEventHandlers = (): void => {
  eventBus.on('user.created', async ({ userId, email, firstName }) => {
    logger.info('Event received: user.created', { userId, email });

    await emailJob.enqueue({
      to: email,
      subject: 'Welcome to the platform!',
      text: `Hi ${firstName}, welcome aboard! We're excited to have you.`,
    });
  });

  eventBus.on('user.updated', ({ userId, changes }) => {
    logger.info('Event received: user.updated', { userId, changes });
  });

  eventBus.on('user.deleted', ({ userId }) => {
    logger.info('Event received: user.deleted', { userId });
  });
};
