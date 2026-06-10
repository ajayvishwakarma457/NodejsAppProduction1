import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { teamController } from './team.controller';
import {
  addMemberSchema,
  createTeamSchema,
  listTeamsQuerySchema,
  removeMemberSchema,
  teamIdParamSchema,
  updateTeamSchema,
} from './team.validation';

export const teamRouter = Router();

teamRouter.get('/', validateMiddleware(listTeamsQuerySchema), asyncHandler(teamController.list));

teamRouter.get('/:id', validateMiddleware(teamIdParamSchema), asyncHandler(teamController.getById));

teamRouter.post('/', validateMiddleware(createTeamSchema), asyncHandler(teamController.create));

teamRouter.patch('/:id', validateMiddleware(updateTeamSchema), asyncHandler(teamController.update));

teamRouter.delete(
  '/:id',
  validateMiddleware(teamIdParamSchema),
  asyncHandler(teamController.remove)
);

teamRouter.post(
  '/:id/members',
  validateMiddleware(addMemberSchema),
  asyncHandler(teamController.addMember)
);

teamRouter.delete(
  '/:id/members',
  validateMiddleware(removeMemberSchema),
  asyncHandler(teamController.removeMember)
);
