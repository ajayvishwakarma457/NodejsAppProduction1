import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { commentController } from "./comment.controller";

export const commentRouter = Router();

commentRouter.get("/", asyncHandler(commentController.list));

