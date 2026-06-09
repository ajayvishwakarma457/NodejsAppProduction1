import { notificationRepository } from "./notification.repository";

export const notificationService = {
  async list() {
    return notificationRepository.findAll();
  }
};

