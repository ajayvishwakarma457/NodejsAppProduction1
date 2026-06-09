import { NotificationDocument, NotificationModel } from "./notification.model";

export const notificationRepository = {
  async findAll(): Promise<NotificationDocument[]> {
    return NotificationModel.find().lean();
  }
};
