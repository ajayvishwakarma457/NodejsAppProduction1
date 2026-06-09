import { Request, Response } from "express";
import { userService } from "./user.service";

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    res.json({ success: true, data: users });
  }
};

