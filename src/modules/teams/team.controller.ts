import { Request, Response } from "express";
import { teamService } from "./team.service";

export const teamController = {
  async list(_req: Request, res: Response) {
    const teams = await teamService.list();
    res.json({ success: true, data: teams });
  }
};

