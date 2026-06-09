import { Request, Response } from "express";
import { projectService } from "./project.service";

export const projectController = {
  async list(_req: Request, res: Response) {
    const projects = await projectService.list();
    res.json({ success: true, data: projects });
  }
};

