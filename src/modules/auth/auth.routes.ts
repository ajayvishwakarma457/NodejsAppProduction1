import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { authController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.validation';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateMiddleware(registerSchema),
  asyncHandler(authController.register)
);
authRouter.post('/login', validateMiddleware(loginSchema), asyncHandler(authController.login));
authRouter.post(
  '/refresh',
  validateMiddleware(refreshTokenSchema),
  asyncHandler(authController.refresh)
);

authRouter.post(
  '/logout',
  authMiddleware,
  validateMiddleware(logoutSchema),
  asyncHandler(authController.logout)
);
authRouter.get('/me', authMiddleware, asyncHandler(authController.me));
authRouter.patch(
  '/change-password',
  authMiddleware,
  validateMiddleware(changePasswordSchema),
  asyncHandler(authController.changePassword)
);
