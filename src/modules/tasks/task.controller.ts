import { Request, Response } from "express";
import { taskService } from "./task.service";

export const taskController = {
  async list(_req: Request, res: Response) {
    const tasks = await taskService.list();
    res.json({ success: true, data: tasks });
  }
};

