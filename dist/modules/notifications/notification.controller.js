"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const notification_service_1 = require("./notification.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.notificationController = {
    async list(req, res) {
        const userId = req.user.id;
        const { data, meta } = await notification_service_1.notificationService.list(req.query, userId);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const userId = req.user.id;
        const notification = await notification_service_1.notificationService.getById(req.params.id, userId);
        if (!notification) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(notification).send(res);
    },
    async create(req, res) {
        const notification = await notification_service_1.notificationService.create(req.body);
        ApiResponse_1.ApiResponse.created(notification, 'Notification created').send(res);
    },
    async markAsRead(req, res) {
        const userId = req.user.id;
        const notification = await notification_service_1.notificationService.markAsRead(req.params.id, userId);
        ApiResponse_1.ApiResponse.ok(notification, 'Notification marked as read').send(res);
    },
    async markAllAsRead(req, res) {
        const userId = req.user.id;
        const count = await notification_service_1.notificationService.markAllAsRead(userId);
        ApiResponse_1.ApiResponse.ok({ count }, 'All notifications marked as read').send(res);
    },
    async remove(req, res) {
        const userId = req.user.id;
        const deleted = await notification_service_1.notificationService.remove(req.params.id, userId);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Notification not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent('Notification deleted').send(res);
    },
    async countUnread(req, res) {
        const userId = req.user.id;
        const count = await notification_service_1.notificationService.countUnread(userId);
        ApiResponse_1.ApiResponse.ok({ count }, 'Unread notification count retrieved').send(res);
    },
};
//# sourceMappingURL=notification.controller.js.map