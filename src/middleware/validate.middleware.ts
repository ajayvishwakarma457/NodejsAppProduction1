import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/ApiError";

export const validateMiddleware = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      next(new ApiError(StatusCodes.BAD_REQUEST, result.error.flatten().formErrors.join(", ")));
      return;
    }

    next();
  };

