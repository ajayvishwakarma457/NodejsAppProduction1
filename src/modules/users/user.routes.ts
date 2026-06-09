import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { userController } from "./user.controller";

export const userRouter = Router();

userRouter.get("/", asyncHandler(userController.list));

