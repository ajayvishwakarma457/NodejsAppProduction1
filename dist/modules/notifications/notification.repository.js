"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const notification_model_1 = require("./notification.model");
exports.notificationRepository = {
    async findAll() {
        return notification_model_1.NotificationModel.find().sort({ createdAt: -1 }).lean();
    },
    async findPending(limit) {
        return notification_model_1.NotificationModel.find({
            status: "pending",
            $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }]
        })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();
    },
    async markAsRead(id, userId) {
        return notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId, isRead: false }, { isRead: true }, { new: true }).lean();
    },
    async markDelivered(id) {
        const result = await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: "delivered", deliveredAt: new Date(), errorMessage: null });
        return result.matchedCount > 0;
    },
    async markFailed(id, errorMessage) {
        await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: "failed", failedAt: new Date(), errorMessage });
    },
    async create(data) {
        return notification_model_1.NotificationModel.create(data);
    },
    async deleteOldReadNotifications(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const result = await notification_model_1.NotificationModel.deleteMany({
            isRead: true,
            createdAt: { $lt: cutoff }
        });
        return result.deletedCount ?? 0;
    }
};
