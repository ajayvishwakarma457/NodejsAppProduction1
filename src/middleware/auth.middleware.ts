import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.header("x-user-id");
  const role = req.header("x-user-role") ?? "member";

  if (!userId) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required"));
    return;
  }

  req.user = { id: userId, role };
  next();
};

