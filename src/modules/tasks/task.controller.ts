import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { taskService } from './task.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const taskController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await taskService.list(req.query as Record<string, unknown>);
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const task = await taskService.getById(req.params.id as string);

    if (!task) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    ApiResponse.ok(task).send(res);
  },

  async create(req: Request, res: Response) {
    const task = await taskService.create(req.body);
    ApiResponse.created(task).send(res);
  },

  async update(req: Request, res: Response) {
    const task = await taskService.update(req.params.id as string, req.body);

    if (!task) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    ApiResponse.ok(task).send(res);
  },

  async remove(req: Request, res: Response) {
    const deleted = await taskService.remove(req.params.id as string);

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    ApiResponse.noContent().send(res);
  },
};
