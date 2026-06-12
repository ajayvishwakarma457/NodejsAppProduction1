import { teamRepository, TeamListFilter } from './team.repository';
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
    return teamRepository.findById(id);
  },

  async create(data: Record<string, unknown>) {
    const ownerId = String(data.ownerId);

    return withTransaction(async ({ session }) => {
      const team = await teamRepository.create(data, session ?? undefined);

      await teamRepository.addMember(
        String(team._id),
        ownerId,
        'owner',
        session ?? undefined
      );

      return teamRepository.findById(String(team._id));
    });
  },

  async update(id: string, data: Record<string, unknown>, userId: string, role?: string) {
    const existing = await teamRepository.findById(id);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only update teams you own');
    }

    return teamRepository.updateById(id, data);
  },

  async remove(id: string, userId: string, role?: string) {
    const existing = await teamRepository.findById(id);
    if (!existing) return false;

    if (!isOwnerOrAdmin(existing.ownerId, userId, role)) {
      throw ApiError.forbidden('You can only delete teams you own');
    }

    return withTransaction(async ({ session }) => {
      const projectIds = await ProjectModel.distinct('_id', { teamId: id }, { session });
      const taskIds = await TaskModel.distinct('_id', { projectId: { $in: projectIds } }, { session });

      await CommentModel.deleteMany({ taskId: { $in: taskIds } }, { session: session ?? undefined });
      await TaskModel.deleteMany({ projectId: { $in: projectIds } }, { session: session ?? undefined });
      await ProjectModel.deleteMany({ teamId: id }, { session: session ?? undefined });
      const result = await teamRepository.deleteById(id, session ?? undefined);

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

    return teamRepository.addMember(teamId, userId, role);
  },

  async removeMember(teamId: string, userId: string, requesterId: string, requesterRole?: string) {
    const existing = await teamRepository.findById(teamId);
    if (!existing) return null;

    if (!isOwnerOrAdmin(existing.ownerId, requesterId, requesterRole)) {
      throw ApiError.forbidden('Only team owners can remove members');
    }

    return teamRepository.removeMember(teamId, userId);
  },
};
