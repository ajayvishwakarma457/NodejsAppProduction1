import { projectRepository, ProjectListFilter } from './project.repository';
import { cacheAside, CACHE_NAMESPACE } from '../../utils/cache';
import { TaskModel } from '../tasks/task.model';
import { CommentModel } from '../comments/comment.model';
import { getPagination } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { isOwnerOrAdmin, isAdmin } from '../../utils/rbac';
import { serializeDocument, serializeDocuments } from '../../utils/serializer';
import { withTransaction } from '../../utils/transaction';
import { eventBus } from '../../utils/event-bus';

export const projectService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: ProjectListFilter = {};

    if (query.status) {
      filter.status = String(query.status);
    }

    if (query.ownerId) {
      filter.ownerId = String(query.ownerId);
    }

    if (query.teamId) {
      filter.teamId = String(query.teamId);
    }

    if (query.search) {
      filter.search = String(query.search);
    }

    const result = await projectRepository.findAll(
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
    const project = await cacheAside.getOrSet(CACHE_NAMESPACE.projects, id, () =>
      projectRepository.findById(id)
    );
    return serializeDocument(project as Record<string, unknown> | null);
  },

  async create(data: Record<string, unknown>) {
    const created = await projectRepository.create(data);
    await cacheAside.invalidatePattern(CACHE_NAMESPACE.projects, 'list:*');

    eventBus.emit('project.created', {
      projectId: (created as unknown as { _id: { toString(): string } })._id.toString(),
      ownerId: String(created.ownerId ?? data.ownerId ?? ''),
      name: String(created.name),
    });

    return serializeDocument(created as Record<string, unknown>);
  },

  async update(id: string, data: Record<string, unknown>, userId: string, role?: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only update projects you own');
    }

    const updated = await projectRepository.updateById(id, data);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.projects, id);
    }
    return serializeDocument(updated as Record<string, unknown> | null);
  },

  async remove(id: string, userId: string, role?: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) return false;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only delete projects you own');
    }

    return withTransaction(async ({ session }) => {
      const taskIds = await TaskModel.distinct('_id', { projectId: id }, { session });

      await CommentModel.deleteMany(
        { taskId: { $in: taskIds } },
        { session: session ?? undefined }
      );
      await TaskModel.deleteMany({ projectId: id }, { session: session ?? undefined });
      const deleted = await projectRepository.deleteById(id, session ?? undefined);
      if (deleted) {
        await cacheAside.invalidateEntity(CACHE_NAMESPACE.projects, id);
      }
      return deleted;
    });
  },

  async getDashboard(userId: string, role?: string) {
    const scopedUserId = isAdmin(role) ? undefined : userId;

    const [statusDistribution, taskSummary] = await Promise.all([
      projectRepository.getStatusDistribution(scopedUserId),
      projectRepository.getProjectTaskSummary(scopedUserId),
    ]);

    return {
      statusDistribution,
      taskSummary,
    };
  },
};
