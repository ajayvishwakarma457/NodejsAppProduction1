import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { taskController } from './task.controller';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from './task.validation';

export const taskRouter = Router();

taskRouter.use(authMiddleware);

taskRouter.get('/', validateMiddleware(listTasksQuerySchema), asyncHandler(taskController.list));

taskRouter.get('/:id', validateMiddleware(taskIdParamSchema), asyncHandler(taskController.getById));

taskRouter.post('/', validateMiddleware(createTaskSchema), asyncHandler(taskController.create));

taskRouter.patch('/:id', validateMiddleware(updateTaskSchema), asyncHandler(taskController.update));

taskRouter.delete(
  '/:id',
  validateMiddleware(taskIdParamSchema),
  asyncHandler(taskController.remove)
);
