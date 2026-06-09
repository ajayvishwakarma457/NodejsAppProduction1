import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get("X-Request-Id") || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};
