import { NextFunction, Request, Response } from "express";

export const uploadMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

