import { projectRepository, ProjectListFilter } from './project.repository';
import { TaskModel } from '../tasks/task.model';
import { CommentModel } from '../comments/comment.model';
import { getPagination } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { isOwnerOrAdmin, isAdmin } from '../../utils/rbac';
import { withTransaction } from '../../utils/transaction';

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

    return projectRepository.findAll(
      {
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sort,
        order: pagination.order as 'asc' | 'desc',
      },
      filter
    );
  },

  async getById(id: string) {
    return projectRepository.findById(id);
  },

  async create(data: Record<string, unknown>) {
    return projectRepository.create(data);
  },

  async update(id: string, data: Record<string, unknown>, userId: string, role?: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only update projects you own');
    }

    return projectRepository.updateById(id, data);
  },

  async remove(id: string, userId: string, role?: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) return false;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only delete projects you own');
    }

    return withTransaction(async ({ session }) => {
      const taskIds = await TaskModel.distinct('_id', { projectId: id }, { session });

      await CommentModel.deleteMany({ taskId: { $in: taskIds } }, { session: session ?? undefined });
      await TaskModel.deleteMany({ projectId: id }, { session: session ?? undefined });
      return projectRepository.deleteById(id, session ?? undefined);
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
