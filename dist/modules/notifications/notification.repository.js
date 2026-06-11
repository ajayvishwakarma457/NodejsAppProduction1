"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const notification_model_1 = require("./notification.model");
const pagination_1 = require("../../utils/pagination");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
    if (filter.userId) {
        query.userId = filter.userId;
    }
    if (filter.isRead !== undefined) {
        query.isRead = filter.isRead;
    }
    if (filter.type) {
        query.type = filter.type;
    }
    return query;
};
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.notificationRepository = {
    /**
     * Find all notifications with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const [data, total] = await Promise.all([
            notification_model_1.NotificationModel.find(query)
                .sort({ [options.sort]: sortDirection })
                .skip(skip)
                .limit(options.limit)
                .lean(),
            notification_model_1.NotificationModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a notification by its MongoDB _id.
     */
    async findById(id) {
        return notification_model_1.NotificationModel.findById(id).lean();
    },
    /**
     * Find notifications for a specific user.
     */
    async findByUserId(userId) {
        return notification_model_1.NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
    },
    /**
     * Find pending notifications that are ready to be delivered.
     */
    async findPending(limit) {
        return notification_model_1.NotificationModel.find({
            status: 'pending',
            $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
        })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();
    },
    /**
     * Mark a single notification as read for a user.
     * Returns the updated document or null if not found / already read.
     */
    async markAsRead(id, userId) {
        return notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId, isRead: false }, { isRead: true, readAt: new Date() }, { new: true }).lean();
    },
    /**
     * Mark all unread notifications as read for a user.
     * Returns the number of documents modified.
     */
    async markAllAsRead(userId) {
        const result = await notification_model_1.NotificationModel.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
        return result.modifiedCount ?? 0;
    },
    /**
     * Mark a notification as delivered.
     * Returns true if a document was matched.
     */
    async markDelivered(id) {
        const result = await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: 'delivered', deliveredAt: new Date(), errorMessage: null });
        return result.matchedCount > 0;
    },
    /**
     * Mark a notification as failed with an error message.
     */
    async markFailed(id, errorMessage) {
        await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: 'failed', failedAt: new Date(), errorMessage });
    },
    /**
     * Create a new notification document.
     */
    async create(data) {
        return notification_model_1.NotificationModel.create(data);
    },
    /**
     * Delete a notification by id. Returns true if a document was deleted.
     */
    async deleteById(id) {
        const result = await notification_model_1.NotificationModel.findByIdAndDelete(id);
        return result !== null;
    },
    /**
     * Count unread notifications for a user.
     */
    async countUnreadByUserId(userId) {
        return notification_model_1.NotificationModel.countDocuments({ userId, isRead: false });
    },
    /**
     * Delete old read notifications older than the given number of days.
     * Returns the number of documents deleted.
     */
    async deleteOldReadNotifications(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const result = await notification_model_1.NotificationModel.deleteMany({
            isRead: true,
            createdAt: { $lt: cutoff },
        });
        return result.deletedCount ?? 0;
    },
};
//# sourceMappingURL=notification.repository.js.map