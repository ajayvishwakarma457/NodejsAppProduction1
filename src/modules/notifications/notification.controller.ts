import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { notificationService } from "./notification.service";
import { ApiResponse } from "../../utils/ApiResponse";

export const notificationController = {
  async list(req: Request, res: Response) {
    const userId = req.user!.id;
    const { data, meta } = await notificationService.list(
      req.query as Record<string, unknown>,
      userId
    );
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const userId = req.user!.id;
    const notification = await notificationService.getById(req.params.id as string, userId);

    if (!notification) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Notification not found"
      });
      return;
    }

    ApiResponse.ok(notification).send(res);
  },

  async create(req: Request, res: Response) {
    const notification = await notificationService.create(req.body);
    ApiResponse.created(notification, "Notification created").send(res);
  },

  async markAsRead(req: Request, res: Response) {
    const userId = req.user!.id;
    const notification = await notificationService.markAsRead(req.params.id as string, userId);
    ApiResponse.ok(notification, "Notification marked as read").send(res);
  },

  async markAllAsRead(req: Request, res: Response) {
    const userId = req.user!.id;
    const count = await notificationService.markAllAsRead(userId);
    ApiResponse.ok({ count }, "All notifications marked as read").send(res);
  },

  async remove(req: Request, res: Response) {
    const userId = req.user!.id;
    const deleted = await notificationService.remove(req.params.id as string, userId);

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Notification not found"
      });
      return;
    }

    ApiResponse.noContent("Notification deleted").send(res);
  },

  async countUnread(req: Request, res: Response) {
    const userId = req.user!.id;
    const count = await notificationService.countUnread(userId);
    ApiResponse.ok({ count }, "Unread notification count retrieved").send(res);
  }
};
