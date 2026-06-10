import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateMiddleware } from "../../middleware/validate.middleware";
import { userController } from "./user.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema
} from "./user.validation";

export const userRouter = Router();

userRouter.get(
  "/",
  validateMiddleware(listUsersQuerySchema),
  asyncHandler(userController.list)
);

userRouter.get(
  "/:id",
  validateMiddleware(userIdParamSchema),
  asyncHandler(userController.getById)
);

userRouter.post(
  "/",
  validateMiddleware(createUserSchema),
  asyncHandler(userController.create)
);

userRouter.patch(
  "/:id",
  validateMiddleware(updateUserSchema),
  asyncHandler(userController.update)
);

userRouter.delete(
  "/:id",
  validateMiddleware(userIdParamSchema),
  asyncHandler(userController.remove)
);
