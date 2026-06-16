import { Request, Response } from 'express';
import { sseService } from './sse.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../config/logger';

/**
 * Establish a Server-Sent Events stream for the authenticated user.
 *
 * The connection stays open and receives server-pushed events such as
 * notifications, task updates, and system broadcasts.
 */
export const streamEvents = (req: Request, res: Response): void => {
  const userId = req.user?.id;
  if (!userId) {
    throw ApiError.unauthorized('Authentication required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);

  sseService.addClient(res, userId);

  req.on('close', () => {
    sseService.removeClient(res, userId);
  });

  req.on('error', (err) => {
    logger.error('SSE request error', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    sseService.removeClient(res, userId);
  });
};
