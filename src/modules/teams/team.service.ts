import { teamRepository, TeamListFilter } from './team.repository';
import { getPagination } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';
import { isOwnerOrAdmin } from '../../utils/rbac';

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
    return teamRepository.create(data);
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

    return teamRepository.deleteById(id);
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
