import { notificationRepository } from "./notification.repository";

export const notificationService = {
  async list() {
    return notificationRepository.findAll();
  },

  async markAsRead(id: string, userId: string) {
    return notificationRepository.markAsRead(id, userId);
  }
};

