import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from './user.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const userController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await userService.list(req.query as Record<string, unknown>);
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const user = await userService.getById(req.params.id as string);

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
    const user = await userService.update(req.params.id as string, req.body);

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
