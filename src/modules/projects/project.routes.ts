import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { projectController } from './project.controller';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
  dashboardProjectsQuerySchema,
} from './project.validation';

export const projectRouter = Router();

projectRouter.use(authMiddleware);

projectRouter.get(
  '/dashboard',
  validateMiddleware(dashboardProjectsQuerySchema),
  asyncHandler(projectController.dashboard)
);

projectRouter.get(
  '/',
  validateMiddleware(listProjectsQuerySchema),
  asyncHandler(projectController.list)
);

projectRouter.get(
  '/:id',
  validateMiddleware(projectIdParamSchema),
  asyncHandler(projectController.getById)
);

projectRouter.post(
  '/',
  validateMiddleware(createProjectSchema),
  asyncHandler(projectController.create)
);

projectRouter.patch(
  '/:id',
  validateMiddleware(updateProjectSchema),
  asyncHandler(projectController.update)
);

projectRouter.delete(
  '/:id',
  validateMiddleware(projectIdParamSchema),
  asyncHandler(projectController.remove)
);
