import { ClientSession, FilterQuery, Types, PipelineStage } from 'mongoose';
import { NotificationDocument, NotificationModel } from './notification.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';
import { timedAggregate } from '../../utils/aggregation';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface NotificationListFilter {
  userId?: string;
  isRead?: boolean;
  type?: string;
}

export interface NotificationListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface NotificationListResult {
  data: NotificationDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: NotificationListFilter): FilterQuery<NotificationDocument> => {
  const query: FilterQuery<NotificationDocument> = {};

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

export const notificationRepository = {
  /**
   * Find all notifications with pagination, sorting, and optional filtering.
   */
  async findAll(
    options: NotificationListOptions,
    filter: NotificationListFilter = {}
  ): Promise<NotificationListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = NotificationModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection())
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'notifications', operation: 'findAll' }),
      NotificationModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a notification by its MongoDB _id.
   */
  async findById(id: string): Promise<NotificationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const query = NotificationModel.findById(id).select(buildListProjection()).lean();
    return timedQuery(query, { collection: 'notifications', operation: 'findById' });
  },

  /**
   * Find notifications for a specific user.
   */
  async findByUserId(userId: string): Promise<NotificationDocument[]> {
    const query = NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'notifications', operation: 'findByUserId' });
  },

  /**
   * Find pending notifications that are ready to be delivered.
   */
  async findPending(limit: number): Promise<NotificationDocument[]> {
    const query = NotificationModel.find({
      status: 'pending',
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'notifications', operation: 'findPending' });
  },

  /**
   * Mark a single notification as read for a user.
   * Returns the updated document or null if not found / already read.
   */
  async markAsRead(
    id: string,
    userId: string,
    session?: ClientSession
  ): Promise<NotificationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const query = NotificationModel.findOneAndUpdate(
      { _id: id, userId, isRead: false },
      { isRead: true, readAt: new Date() },
      { new: true, session }
    ).lean();
    return timedQuery(query, { collection: 'notifications', operation: 'markAsRead' });
  },

  /**
   * Mark all unread notifications as read for a user.
   * Returns the number of documents modified.
   */
  async markAllAsRead(userId: string, session?: ClientSession): Promise<number> {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
      { session }
    );
    return result.modifiedCount ?? 0;
  },

  /**
   * Mark a notification as delivered.
   * Returns true if a document was matched.
   */
  async markDelivered(id: string, session?: ClientSession): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await NotificationModel.updateOne(
      { _id: id },
      { status: 'delivered', deliveredAt: new Date(), errorMessage: null },
      { session }
    );
    return result.matchedCount > 0;
  },

  /**
   * Mark a notification as failed with an error message.
   */
  async markFailed(id: string, errorMessage: string, session?: ClientSession): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await NotificationModel.updateOne(
      { _id: id },
      { status: 'failed', failedAt: new Date(), errorMessage },
      { session }
    );
  },

  /**
   * Create a new notification document.
   */
  async create(
    data: Partial<NotificationDocument>,
    session?: ClientSession
  ): Promise<NotificationDocument> {
    const doc = new NotificationModel(data);
    return doc.save({ session });
  },

  /**
   * Delete a notification by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await NotificationModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple notifications matching a filter.
   */
  async deleteMany(
    filter: FilterQuery<NotificationDocument>,
    session?: ClientSession
  ): Promise<number> {
    const result = await NotificationModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Count unread notifications for a user.
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, isRead: false });
  },

  /**
   * Delete old read notifications older than the given number of days.
   * Returns the number of documents deleted.
   */
  async deleteOldReadNotifications(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await NotificationModel.deleteMany({
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
  async getUnreadCountsByType(userId: string): Promise<{ _id: string; count: number }[]> {
    const pipeline: PipelineStage[] = [
      { $match: { userId: new Types.ObjectId(userId), isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    return timedAggregate<{ _id: string; count: number }>(NotificationModel, pipeline, {
      operation: 'getUnreadCountsByType',
    });
  },

  /**
   * Delivery status counts (pending/delivered/failed) for a user or globally.
   */
  async getDeliveryStats(userId?: string): Promise<{ _id: string; count: number }[]> {
    const match: Record<string, unknown> = {};
    if (userId) {
      match.userId = new Types.ObjectId(userId);
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    return timedAggregate<{ _id: string; count: number }>(NotificationModel, pipeline, {
      operation: 'getDeliveryStats',
    });
  },
};
