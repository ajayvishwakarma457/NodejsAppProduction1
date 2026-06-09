import { NotificationDocument, NotificationModel } from "./notification.model";

export const notificationRepository = {
  async findAll(): Promise<NotificationDocument[]> {
    return NotificationModel.find().lean();
  },

  async markAsRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId, isRead: false },
      { isRead: true },
      { new: true }
    ).lean();
  }
};
