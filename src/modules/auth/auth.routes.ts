import { Router } from 'express';
import passport from '../../config/passport';
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
import { apiKeyRouter } from '../api-keys/api-key.routes';

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

/* ------------------------------------------------------------------ */
// OAuth routes
/* ------------------------------------------------------------------ */

authRouter.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failWithError: true }),
  asyncHandler(authController.oauthCallback)
);

authRouter.get(
  '/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] })
);

authRouter.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failWithError: true }),
  asyncHandler(authController.oauthCallback)
);

/* ------------------------------------------------------------------ */
// API key management routes (mounted under /api/v1/auth/api-keys)
/* ------------------------------------------------------------------ */

authRouter.use('/api-keys', apiKeyRouter);
