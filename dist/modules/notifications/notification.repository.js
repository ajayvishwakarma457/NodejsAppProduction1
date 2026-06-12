"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const mongoose_1 = require("mongoose");
const notification_model_1 = require("./notification.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
const aggregation_1 = require("../../utils/aggregation");
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
        const listQuery = notification_model_1.NotificationModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'notifications', operation: 'findAll' }),
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
        const query = notification_model_1.NotificationModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'notifications', operation: 'findById' });
    },
    /**
     * Find notifications for a specific user.
     */
    async findByUserId(userId) {
        const query = notification_model_1.NotificationModel.find({ userId })
            .sort({ createdAt: -1 })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'notifications', operation: 'findByUserId' });
    },
    /**
     * Find pending notifications that are ready to be delivered.
     */
    async findPending(limit) {
        const query = notification_model_1.NotificationModel.find({
            status: 'pending',
            $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
        })
            .sort({ createdAt: 1 })
            .limit(limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'notifications', operation: 'findPending' });
    },
    /**
     * Mark a single notification as read for a user.
     * Returns the updated document or null if not found / already read.
     */
    async markAsRead(id, userId, session) {
        const query = notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId, isRead: false }, { isRead: true, readAt: new Date() }, { new: true, session }).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'notifications', operation: 'markAsRead' });
    },
    /**
     * Mark all unread notifications as read for a user.
     * Returns the number of documents modified.
     */
    async markAllAsRead(userId, session) {
        const result = await notification_model_1.NotificationModel.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() }, { session });
        return result.modifiedCount ?? 0;
    },
    /**
     * Mark a notification as delivered.
     * Returns true if a document was matched.
     */
    async markDelivered(id, session) {
        const result = await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: 'delivered', deliveredAt: new Date(), errorMessage: null }, { session });
        return result.matchedCount > 0;
    },
    /**
     * Mark a notification as failed with an error message.
     */
    async markFailed(id, errorMessage, session) {
        await notification_model_1.NotificationModel.updateOne({ _id: id }, { status: 'failed', failedAt: new Date(), errorMessage }, { session });
    },
    /**
     * Create a new notification document.
     */
    async create(data, session) {
        const doc = new notification_model_1.NotificationModel(data);
        return doc.save({ session });
    },
    /**
     * Delete a notification by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await notification_model_1.NotificationModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple notifications matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await notification_model_1.NotificationModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
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
    /* ------------------------------------------------------------------ */
    // Aggregations
    /* ------------------------------------------------------------------ */
    /**
     * Count unread notifications grouped by type for a user.
     */
    async getUnreadCountsByType(userId) {
        const pipeline = [
            { $match: { userId: new mongoose_1.Types.ObjectId(userId), isRead: false } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ];
        return (0, aggregation_1.timedAggregate)(notification_model_1.NotificationModel, pipeline, {
            operation: 'getUnreadCountsByType',
        });
    },
    /**
     * Delivery status counts (pending/delivered/failed) for a user or globally.
     */
    async getDeliveryStats(userId) {
        const match = {};
        if (userId) {
            match.userId = new mongoose_1.Types.ObjectId(userId);
        }
        const pipeline = [
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ];
        return (0, aggregation_1.timedAggregate)(notification_model_1.NotificationModel, pipeline, {
            operation: 'getDeliveryStats',
        });
    },
};
//# sourceMappingURL=notification.repository.js.map