"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
const serializer_1 = require("../../utils/serializer");
const notification_repository_1 = require("./notification.repository");
exports.notificationService = {
    async list(query, userId) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = { userId };
        if (query.isRead !== undefined) {
            filter.isRead = String(query.isRead) === 'true';
        }
        if (query.type) {
            filter.type = String(query.type);
        }
        const result = await notification_repository_1.notificationRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
        return {
            ...result,
            data: (0, serializer_1.serializeDocuments)(result.data),
        };
    },
    async getById(id, userId) {
        const notification = await notification_repository_1.notificationRepository.findById(id);
        if (notification && String(notification.userId) !== userId) {
            throw ApiError_1.ApiError.forbidden('You do not have access to this notification');
        }
        return (0, serializer_1.serializeDocument)(notification);
    },
    async create(data) {
        const notification = await notification_repository_1.notificationRepository.create(data);
        return (0, serializer_1.serializeDocument)(notification);
    },
    async markAsRead(id, userId) {
        const notification = await notification_repository_1.notificationRepository.markAsRead(id, userId);
        if (!notification) {
            throw ApiError_1.ApiError.notFound('Notification not found or already read');
        }
        return notification;
    },
    async markAllAsRead(userId) {
        return notification_repository_1.notificationRepository.markAllAsRead(userId);
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
    async remove(id, userId) {
        const notification = await notification_repository_1.notificationRepository.findById(id);
        if (!notification) {
            throw ApiError_1.ApiError.notFound('Notification not found');
        }
        if (String(notification.userId) !== userId) {
            throw ApiError_1.ApiError.forbidden('You do not have access to this notification');
        }
        return notification_repository_1.notificationRepository.deleteById(id);
    },
    async countUnread(userId) {
        return notification_repository_1.notificationRepository.countUnreadByUserId(userId);
    },
    async cleanupOldReadNotifications(days) {
        return notification_repository_1.notificationRepository.deleteOldReadNotifications(days);
    },
    async getDashboard(userId) {
        const [unreadByType, deliveryStats] = await Promise.all([
            notification_repository_1.notificationRepository.getUnreadCountsByType(userId),
            notification_repository_1.notificationRepository.getDeliveryStats(userId),
        ]);
        return {
            unreadByType,
            deliveryStats,
        };
    },
};
//# sourceMappingURL=notification.service.js.map