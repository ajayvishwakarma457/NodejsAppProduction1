"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
exports.notificationService = {
    async list() {
        return notification_repository_1.notificationRepository.findAll();
    },
    async markAsRead(id, userId) {
        return notification_repository_1.notificationRepository.markAsRead(id, userId);
    },
    async create(data) {
        return notification_repository_1.notificationRepository.create(data);
    },
    async getPending(limit) {
        return notification_repository_1.notificationRepository.findPending(limit);
    },
    async markDelivered(id) {
        return notification_repository_1.notificationRepository.markDelivered(id);
    },
    async markFailed(id, errorMessage) {
        return notification_repository_1.notificationRepository.markFailed(id, errorMessage);
    },
    async cleanupOldReadNotifications(days) {
        return notification_repository_1.notificationRepository.deleteOldReadNotifications(days);
    }
};
