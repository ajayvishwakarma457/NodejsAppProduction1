import { teamRepository, TeamListFilter } from './team.repository';
import { getPagination } from '../../utils/pagination';

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

  async update(id: string, data: Record<string, unknown>) {
    return teamRepository.updateById(id, data);
  },

  async remove(id: string) {
    return teamRepository.deleteById(id);
  },

  async addMember(teamId: string, userId: string, role?: string) {
    return teamRepository.addMember(teamId, userId, role);
  },

  async removeMember(teamId: string, userId: string) {
    return teamRepository.removeMember(teamId, userId);
  },
};
