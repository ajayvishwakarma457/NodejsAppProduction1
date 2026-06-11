import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { taskService } from './task.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { isAdmin } from '../../utils/rbac';

export const taskController = {
  async list(req: Request, res: Response) {
    const query = req.query as Record<string, unknown>;
    // Non-admins only see tasks they created or are assigned to
    if (!isAdmin(req.user!.role)) {
      query.createdBy = req.user!.id;
    }
    const { data, meta } = await taskService.list(query);
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
    const body = { ...req.body, createdBy: req.user!.id };
    const task = await taskService.create(body);
    ApiResponse.created(task).send(res);
  },

  async update(req: Request, res: Response) {
    const task = await taskService.update(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role
    );

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
    const deleted = await taskService.remove(req.params.id as string, req.user!.id, req.user!.role);

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
