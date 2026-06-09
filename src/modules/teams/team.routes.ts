import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { teamController } from "./team.controller";

export const teamRouter = Router();

teamRouter.get("/", asyncHandler(teamController.list));

