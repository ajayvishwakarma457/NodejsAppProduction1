import { ApiError } from '../../utils/ApiError';
import { getPagination } from '../../utils/pagination';
import { serializeDocument, serializeDocuments } from '../../utils/serializer';
import { NotificationDocument } from './notification.model';
import { notificationRepository, NotificationListFilter } from './notification.repository';

export const notificationService = {
  async list(query: Record<string, unknown>, userId: string) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: NotificationListFilter = { userId };

    if (query.isRead !== undefined) {
      filter.isRead = String(query.isRead) === 'true';
    }

    if (query.type) {
      filter.type = String(query.type);
    }

    const result = await notificationRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as 'asc' | 'desc',
      },
      filter
    );

    return {
      ...result,
      data: serializeDocuments(result.data as unknown as Record<string, unknown>[]),
    };
  },

  async getById(id: string, userId: string): Promise<Record<string, unknown> | null> {
    const notification = await notificationRepository.findById(id);

    if (notification && String(notification.userId) !== userId) {
      throw ApiError.forbidden('You do not have access to this notification');
    }

    return serializeDocument(notification as unknown as Record<string, unknown> | null);
  },

  async create(data: Partial<NotificationDocument>): Promise<Record<string, unknown>> {
    const notification = await notificationRepository.create(data);
    return serializeDocument(notification as unknown as Record<string, unknown>)!;
  },

  async markAsRead(id: string, userId: string): Promise<NotificationDocument | null> {
    const notification = await notificationRepository.markAsRead(id, userId);

    if (!notification) {
      throw ApiError.notFound('Notification not found or already read');
    }

    return notification;
  },

  async markAllAsRead(userId: string): Promise<number> {
    return notificationRepository.markAllAsRead(userId);
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

  async remove(id: string, userId: string): Promise<boolean> {
    const notification = await notificationRepository.findById(id);

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (String(notification.userId) !== userId) {
      throw ApiError.forbidden('You do not have access to this notification');
    }

    return notificationRepository.deleteById(id);
  },

  async countUnread(userId: string): Promise<number> {
    return notificationRepository.countUnreadByUserId(userId);
  },

  async cleanupOldReadNotifications(days: number): Promise<number> {
    return notificationRepository.deleteOldReadNotifications(days);
  },

  async getDashboard(userId: string) {
    const [unreadByType, deliveryStats] = await Promise.all([
      notificationRepository.getUnreadCountsByType(userId),
      notificationRepository.getDeliveryStats(userId),
    ]);

    return {
      unreadByType,
      deliveryStats,
    };
  },
};
