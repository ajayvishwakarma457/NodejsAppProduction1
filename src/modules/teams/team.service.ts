import { teamRepository, TeamListFilter } from './team.repository';
import { cacheAside, CACHE_NAMESPACE } from '../../utils/cache';
import { ProjectModel } from '../projects/project.model';
import { TaskModel } from '../tasks/task.model';
import { CommentModel } from '../comments/comment.model';
import { getPagination } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { isOwnerOrAdmin } from '../../utils/rbac';
import { withTransaction } from '../../utils/transaction';

export const teamService = {
  async list(query: Record<string, unknown>) {
    const pagination = getPagination(query.page, query.limit, query.sort, query.order);

    const filter: TeamListFilter = {};

    if (query.ownerId) {
      filter.ownerId = String(query.ownerId);
    }

    if (query.memberId) {
      filter.memberId = String(query.memberId);
    }

    if (query.search) {
      filter.search = String(query.search);
    }

    return teamRepository.findAll(
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
    return cacheAside.getOrSet(CACHE_NAMESPACE.teams, id, () => teamRepository.findById(id));
  },

  async create(data: Record<string, unknown>) {
    const ownerId = String(data.ownerId);

    return withTransaction(async ({ session }) => {
      const team = await teamRepository.create(data, session ?? undefined);

      await teamRepository.addMember(String(team._id), ownerId, 'owner', session ?? undefined);

      const created = await teamRepository.findById(String(team._id));
      if (created) {
        await cacheAside.invalidatePattern(CACHE_NAMESPACE.teams, 'list:*');
      }
      return created;
    });
  },

  async update(id: string, data: Record<string, unknown>, userId: string, role?: string) {
    const existing = await teamRepository.findById(id);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only update teams you own');
    }

    const updated = await teamRepository.updateById(id, data);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.teams, id);
    }
    return updated;
  },

  async remove(id: string, userId: string, role?: string) {
    const existing = await teamRepository.findById(id);
    if (!existing) return false;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only delete teams you own');
    }

    return withTransaction(async ({ session }) => {
      const projectIds = await ProjectModel.distinct('_id', { teamId: id }, { session });
      const taskIds = await TaskModel.distinct(
        '_id',
        { projectId: { $in: projectIds } },
        { session }
      );

      await CommentModel.deleteMany(
        { taskId: { $in: taskIds } },
        { session: session ?? undefined }
      );
      await TaskModel.deleteMany(
        { projectId: { $in: projectIds } },
        { session: session ?? undefined }
      );
      await ProjectModel.deleteMany({ teamId: id }, { session: session ?? undefined });
      const result = await teamRepository.deleteById(id, session ?? undefined);

      if (result) {
        await cacheAside.invalidateEntity(CACHE_NAMESPACE.teams, id);
      }

      return result;
    });
  },

  async addMember(
    teamId: string,
    userId: string,
    role: string | undefined,
    requesterId: string,
    requesterRole?: string
  ) {
    const existing = await teamRepository.findById(teamId);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, requesterId, requesterRole)) {
      throw ApiError.forbidden('Only team owners can add members');
    }

    const updated = await teamRepository.addMember(teamId, userId, role);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.teams, teamId);
    }
    return updated;
  },

  async removeMember(teamId: string, userId: string, requesterId: string, requesterRole?: string) {
    const existing = await teamRepository.findById(teamId);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, requesterId, requesterRole)) {
      throw ApiError.forbidden('Only team owners can remove members');
    }

    const updated = await teamRepository.removeMember(teamId, userId);
    if (updated) {
      await cacheAside.invalidateEntity(CACHE_NAMESPACE.teams, teamId);
    }
    return updated;
  },
};
