import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export const roleMiddleware =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const actualRole = req.user?.role;

    if (!req.user || !allowedRoles.includes(actualRole!)) {
      logger.warn('Access denied: insufficient role', {
        method: req.method,
        url: req.originalUrl || req.url,
        requestId: req.requestId,
        userId: req.user?.id,
        actualRole,
        requiredRoles: allowedRoles,
      });

      next(
        new ApiError(StatusCodes.FORBIDDEN, 'Insufficient permissions', {
          requiredRoles: allowedRoles,
          actualRole,
        })
      );
      return;
    }

    next();
  };
