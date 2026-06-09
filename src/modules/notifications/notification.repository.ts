import { NotificationDocument, NotificationModel } from "./notification.model";

export const notificationRepository = {
  async findAll(): Promise<NotificationDocument[]> {
    return NotificationModel.find().sort({ createdAt: -1 }).lean();
  },

  async findPending(limit: number): Promise<NotificationDocument[]> {
    return NotificationModel.find({
      status: "pending",
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }]
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
  },

  async markAsRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId, isRead: false },
      { isRead: true },
      { new: true }
    ).lean();
  },

  async markDelivered(id: string): Promise<boolean> {
    const result = await NotificationModel.updateOne(
      { _id: id },
      { status: "delivered", deliveredAt: new Date(), errorMessage: null }
    );
    return result.matchedCount > 0;
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await NotificationModel.updateOne(
      { _id: id },
      { status: "failed", failedAt: new Date(), errorMessage }
    );
  },

  async create(data: Partial<NotificationDocument>): Promise<NotificationDocument> {
    return NotificationModel.create(data);
  },

  async deleteOldReadNotifications(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await NotificationModel.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoff }
    });

    return result.deletedCount ?? 0;
  }
};
