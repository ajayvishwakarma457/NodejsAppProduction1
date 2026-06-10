import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { commentController } from './comment.controller';
import {
  createCommentSchema,
  listCommentsQuerySchema,
  commentIdParamSchema,
  updateCommentSchema,
} from './comment.validation';

export const commentRouter = Router();

commentRouter.use(authMiddleware);

commentRouter.get(
  '/',
  validateMiddleware(listCommentsQuerySchema),
  asyncHandler(commentController.list)
);

commentRouter.get(
  '/:id',
  validateMiddleware(commentIdParamSchema),
  asyncHandler(commentController.getById)
);

commentRouter.post(
  '/',
  validateMiddleware(createCommentSchema),
  asyncHandler(commentController.create)
);

commentRouter.patch(
  '/:id',
  validateMiddleware(updateCommentSchema),
  asyncHandler(commentController.update)
);

commentRouter.delete(
  '/:id',
  validateMiddleware(commentIdParamSchema),
  asyncHandler(commentController.remove)
);
