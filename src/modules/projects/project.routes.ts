import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { projectController } from "./project.controller";

export const projectRouter = Router();

projectRouter.get("/", asyncHandler(projectController.list));

