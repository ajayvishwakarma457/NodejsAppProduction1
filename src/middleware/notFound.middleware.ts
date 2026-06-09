import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { logger } from "../config/logger";

export const notFoundMiddleware = (req: Request, res: Response) => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;

  logger.warn(message, {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    requestId: req.requestId,
    ip: req.ip,
    ...(req.user?.id ? { userId: req.user.id } : {})
  });

  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message,
    requestId: req.requestId
  });
};
