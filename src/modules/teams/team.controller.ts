import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { teamService } from './team.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { isAdmin } from '../../utils/rbac';

export const teamController = {
  async list(req: Request, res: Response) {
    const query = req.query as Record<string, unknown>;
    // Non-admins only see teams they own or are members of
    if (!isAdmin(req.user!.role)) {
      query.memberId = req.user!.id;
    }
    const { data, meta } = await teamService.list(query);
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
    const body = { ...req.body, ownerId: req.user!.id };
    const team = await teamService.create(body);
    ApiResponse.created(team).send(res);
  },

  async update(req: Request, res: Response) {
    const team = await teamService.update(
      req.params.id as string,
      req.body,
      req.user!.id,
      req.user!.role
    );

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
    const deleted = await teamService.remove(req.params.id as string, req.user!.id, req.user!.role);

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
      req.body.role as string,
      req.user!.id,
      req.user!.role
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
    const team = await teamService.removeMember(
      req.params.id as string,
      req.body.userId as string,
      req.user!.id,
      req.user!.role
    );

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
