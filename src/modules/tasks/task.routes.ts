import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { taskController } from "./task.controller";

export const taskRouter = Router();

taskRouter.get("/", asyncHandler(taskController.list));

