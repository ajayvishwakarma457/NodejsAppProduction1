import { Request, Response } from "express";
import { notificationService } from "./notification.service";

export const notificationController = {
  async list(_req: Request, res: Response) {
    const notifications = await notificationService.list();
    res.json({ success: true, data: notifications });
  }
};

