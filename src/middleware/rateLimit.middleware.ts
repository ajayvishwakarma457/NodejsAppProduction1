import { NextFunction, Request, Response } from "express";

export const rateLimitMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

