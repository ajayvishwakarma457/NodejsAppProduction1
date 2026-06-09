import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { notificationController } from "./notification.controller";

export const notificationRouter = Router();

notificationRouter.get("/", asyncHandler(notificationController.list));

