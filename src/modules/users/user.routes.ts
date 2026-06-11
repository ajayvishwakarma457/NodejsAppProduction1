import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { roleMiddleware } from '../../middleware/role.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { userController } from './user.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from './user.validation';

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get(
  '/',
  roleMiddleware('admin'),
  validateMiddleware(listUsersQuerySchema),
  asyncHandler(userController.list)
);

userRouter.get('/:id', validateMiddleware(userIdParamSchema), asyncHandler(userController.getById));

userRouter.post(
  '/',
  roleMiddleware('admin'),
  validateMiddleware(createUserSchema),
  asyncHandler(userController.create)
);

userRouter.patch('/:id', validateMiddleware(updateUserSchema), asyncHandler(userController.update));

userRouter.delete(
  '/:id',
  roleMiddleware('admin'),
  validateMiddleware(userIdParamSchema),
  asyncHandler(userController.remove)
);
