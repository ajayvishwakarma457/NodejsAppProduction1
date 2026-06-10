import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { projectService } from './project.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const projectController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await projectService.list(req.query as Record<string, unknown>);
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
    const project = await projectService.create(req.body);
    ApiResponse.created(project, 'Project created').send(res);
  },

  async update(req: Request, res: Response) {
    const project = await projectService.update(req.params.id as string, req.body);

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
    const deleted = await projectService.remove(req.params.id as string);

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
