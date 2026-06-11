import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from './user.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { isAdmin, isOwnerOrAdmin } from '../../utils/rbac';

export const userController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await userService.list(req.query as Record<string, unknown>);
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const targetId = req.params.id as string;
    const currentUserId = req.user!.id;
    const currentRole = req.user!.role;

    if (!isOwnerOrAdmin(targetId, currentUserId, currentRole)) {
      throw ApiError.forbidden('You can only view your own profile or require admin access');
    }

    const user = await userService.getById(targetId);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    ApiResponse.ok(user).send(res);
  },

  async create(req: Request, res: Response) {
    const user = await userService.create(req.body);
    ApiResponse.created(user).send(res);
  },

  async update(req: Request, res: Response) {
    const targetId = req.params.id as string;
    const currentUserId = req.user!.id;
    const currentRole = req.user!.role;

    if (!isOwnerOrAdmin(targetId, currentUserId, currentRole)) {
      throw ApiError.forbidden('You can only update your own profile or require admin access');
    }

    // Non-admins cannot change their own role
    const body = { ...req.body };
    if (!isAdmin(currentRole)) {
      delete body.role;
    }

    const user = await userService.update(targetId, body);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    ApiResponse.ok(user).send(res);
  },

  async remove(req: Request, res: Response) {
    const deleted = await userService.remove(req.params.id as string);

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    ApiResponse.noContent().send(res);
  },
};
