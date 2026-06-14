import { taskRepository, TaskListFilter } from './task.repository';
import { cacheAside, CACHE_NAMESPACE } from '../../utils/cache';
import { CommentModel } from '../comments/comment.model';
import { getPagination } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { isOwnerOrAdmin, isAdmin } from '../../utils/rbac';
import { serializeDocument, serializeDocuments } from '../../utils/serializer';
import { withTransaction } from '../../utils/transaction';
import { eventBus } from '../../utils/event-bus';

export const taskService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: TaskListFilter = {};

    if (query.projectId) {
      filter.projectId = String(query.projectId);
    }

    if (query.assignedTo) {
      filter.assignedTo = String(query.assignedTo);
    }

    if (query.createdBy) {
      filter.createdBy = String(query.createdBy);
    }

    if (query.status) {
      filter.status = String(query.status);
    }

    if (query.priority) {
      filter.priority = String(query.priority);
    }

    if (query.search) {
      filter.search = String(query.search);
    }

    const result = await taskRepository.findAll(
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
      data: serializeDocuments(result.data as Record<string, unknown>[]),
    };
  },

  async getById(id: string) {
    const task = await cacheAside.getOrSet(CACHE_NAMESPACE.tasks, id, () =>
      taskRepository.findById(id)
    );
    return serializeDocument(task as Record<string, unknown> | null);
  },

  async create(data: Record<string, unknown>) {
    const created = await taskRepository.create(data);
    await cacheAside.invalidatePattern(CACHE_NAMESPACE.tasks, 'list:*');

    const taskId = (created as unknown as { _id: { toString(): string } })._id.toString();
    const createdBy = String(created.createdBy ?? data.createdBy ?? '');

    eventBus.emit('task.created', { taskId, createdBy });

    if (created.assignedTo) {
      eventBus.emit('task.assigned', {
        taskId,
        userId: String(created.assignedTo),
        title: String(created.title),
        assignedBy: createdBy,
      });
    }

    return serializeDocument(created as Record<string, unknown>);
  },

  async update(id: string, data: Record<string, unknown>, userId: string, role?: string) {
    const existing = await taskRepository.findById(id);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.createdBy, userId, role)) {
      throw ApiError.forbidden('You can only update tasks you created');
    }

    const previousAssignee = existing.assignedTo ? String(existing.assignedTo) : undefined;

    const updated = await taskRepository.updateById(id, data);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.tasks, id);

      const newAssignee = data.assignedTo ? String(data.assignedTo) : undefined;
      if (newAssignee && newAssignee !== previousAssignee) {
        eventBus.emit('task.assigned', {
          taskId: id,
          userId: newAssignee,
          title: String(updated.title),
          assignedBy: userId,
        });
      }
    }
    return serializeDocument(updated as Record<string, unknown> | null);
  },

  async remove(id: string, userId: string, role?: string) {
    const existing = await taskRepository.findById(id);
    if (!existing) return false;

    if (!isOwnerOrAdmin(existing.createdBy, userId, role)) {
      throw ApiError.forbidden('You can only delete tasks you created');
    }

    return withTransaction(async ({ session }) => {
      await CommentModel.deleteMany({ taskId: id }, { session: session ?? undefined });
      const deleted = await taskRepository.deleteById(id, session ?? undefined);
      if (deleted) {
        await cacheAside.invalidateEntity(CACHE_NAMESPACE.tasks, id);
      }
      return deleted;
    });
  },

  async findDueInRange(start: Date, end: Date) {
    return taskRepository.findDueInRange(start, end);
  },

  async findOverdue(before: Date) {
    return taskRepository.findOverdue(before);
  },

  async getDashboard(userId: string, role?: string) {
    const scopedUserId = isAdmin(role) ? undefined : userId;

    const [statusDistribution, priorityDistribution, overdueSummary, workload] = await Promise.all([
      taskRepository.getStatusDistribution(scopedUserId),
      taskRepository.getPriorityDistribution(scopedUserId),
      taskRepository.getOverdueSummary(scopedUserId),
      taskRepository.getWorkloadByUser(scopedUserId, 10),
    ]);

    return {
      statusDistribution,
      priorityDistribution,
      overdueSummary,
      workload,
    };
  },
};
