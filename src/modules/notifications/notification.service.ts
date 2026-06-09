import { notificationRepository } from "./notification.repository";
import { NotificationDocument } from "./notification.model";

export const notificationService = {
  async list(): Promise<NotificationDocument[]> {
    return notificationRepository.findAll();
  },

  async markAsRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return notificationRepository.markAsRead(id, userId);
  },

  async create(data: Partial<NotificationDocument>): Promise<NotificationDocument> {
    return notificationRepository.create(data);
  },

  async getPending(limit: number): Promise<NotificationDocument[]> {
    return notificationRepository.findPending(limit);
  },

  async markDelivered(id: string): Promise<boolean> {
    return notificationRepository.markDelivered(id);
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    return notificationRepository.markFailed(id, errorMessage);
  },

  async cleanupOldReadNotifications(days: number): Promise<number> {
    return notificationRepository.deleteOldReadNotifications(days);
  }
};
