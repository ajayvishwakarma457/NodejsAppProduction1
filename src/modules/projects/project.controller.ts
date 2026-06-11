import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { projectService } from './project.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { isAdmin } from '../../utils/rbac';

export const projectController = {
  async list(req: Request, res: Response) {
    const query = req.query as Record<string, unknown>;
    // Non-admins only see their own projects by default
    if (!isAdmin(req.user!.role)) {
      query.ownerId = req.user!.id;
    }
    const { data, meta } = await projectService.list(query);
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const project = await projectService.getById(req.params.id as string);

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    ApiResponse.ok(project).send(res);
  },

  async create(req: Request, res: Response) {
    const body = { ...req.body, ownerId: req.user!.id };
    const project = await projectService.create(body);
    ApiResponse.created(project, 'Project created').send(res);
  },

  async update(req: Request, res: Response) {
    const project = await projectService.update(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role
    );

    if (!project) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    ApiResponse.ok(project, 'Project updated').send(res);
  },

  async remove(req: Request, res: Response) {
    const deleted = await projectService.remove(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    ApiResponse.noContent('Project deleted').send(res);
  },
};
