import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { teamService } from './team.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const teamController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await teamService.list(req.query as Record<string, unknown>);
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const team = await teamService.getById(req.params.id as string);

    if (!team) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Team not found',
      });
      return;
    }

    ApiResponse.ok(team).send(res);
  },

  async create(req: Request, res: Response) {
    const team = await teamService.create(req.body);
    ApiResponse.created(team).send(res);
  },

  async update(req: Request, res: Response) {
    const team = await teamService.update(req.params.id as string, req.body);

    if (!team) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Team not found',
      });
      return;
    }

    ApiResponse.ok(team).send(res);
  },

  async remove(req: Request, res: Response) {
    const deleted = await teamService.remove(req.params.id as string);

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Team not found',
      });
      return;
    }

    ApiResponse.noContent().send(res);
  },

  async addMember(req: Request, res: Response) {
    const team = await teamService.addMember(
      req.params.id as string,
      req.body.userId as string,
      req.body.role as string
    );

    if (!team) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Team not found or member already exists',
      });
      return;
    }

    ApiResponse.ok(team).send(res);
  },

  async removeMember(req: Request, res: Response) {
    const team = await teamService.removeMember(req.params.id as string, req.body.userId as string);

    if (!team) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Team not found',
      });
      return;
    }

    ApiResponse.ok(team).send(res);
  },
};
