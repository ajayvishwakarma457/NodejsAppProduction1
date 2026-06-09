import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError";

export const roleMiddleware = (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(new ApiError(StatusCodes.FORBIDDEN, "Insufficient permissions"));
      return;
    }

    next();
  };

