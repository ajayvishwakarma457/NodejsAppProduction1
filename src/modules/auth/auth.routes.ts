import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateMiddleware } from "../../middleware/validate.middleware";
import { authController } from "./auth.controller";
import { loginSchema } from "./auth.validation";

export const authRouter = Router();

authRouter.post("/login", validateMiddleware(loginSchema), asyncHandler(authController.login));

