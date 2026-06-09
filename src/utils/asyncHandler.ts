import { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../config/logger";

export const asyncHandler = <
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
>(
  handler: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
  (req, res, next) => {
    void handler(req, res, next).catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));

      logger.error("Request handler error", {
        method: req.method,
        url: req.originalUrl,
        userId: (req as Request & { user?: { id: string } }).user?.id,
        error: error.message
      });

      next(error);
    });
  };
