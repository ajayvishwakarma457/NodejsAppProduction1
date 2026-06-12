import { ClientSession, FilterQuery } from 'mongoose';
import { TeamDocument, TeamModel } from './team.model';
import { buildPaginationMeta, PaginationMeta } from '../../utils/pagination';
import { timedQuery, buildListProjection } from '../../utils/query-optimizer';

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

export interface TeamListFilter {
  ownerId?: string;
  memberId?: string;
  search?: string;
}

export interface TeamListOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface TeamListResult {
  data: TeamDocument[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const buildFilterQuery = (filter: TeamListFilter): FilterQuery<TeamDocument> => {
  const query: FilterQuery<TeamDocument> = {};

  if (filter.ownerId) {
    query.ownerId = filter.ownerId;
  }

  if (filter.memberId) {
    query.$or = [{ ownerId: filter.memberId }, { 'members.userId': filter.memberId }];
  }

  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: 'i' } },
      { description: { $regex: filter.search, $options: 'i' } },
    ];
  }

  return query;
};

/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */

export const teamRepository = {
  /**
   * Find all teams with pagination, sorting, and optional filtering.
   */
  async findAll(options: TeamListOptions, filter: TeamListFilter = {}): Promise<TeamListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === 'desc' ? -1 : 1;

    const listQuery = TeamModel.find(query)
      .sort({ [options.sort]: sortDirection })
      .skip(skip)
      .limit(options.limit)
      .select(buildListProjection())
      .lean();

    const [data, total] = await Promise.all([
      timedQuery(listQuery, { collection: 'teams', operation: 'findAll' }),
      TeamModel.countDocuments(query),
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  },

  /**
   * Find a team by its MongoDB _id.
   */
  async findById(id: string): Promise<TeamDocument | null> {
    const query = TeamModel.findById(id).select(buildListProjection()).lean();
    return timedQuery(query, { collection: 'teams', operation: 'findById' });
  },

  /**
   * Find a team by id with owner and member details populated.
   */
  async findByIdWithMembers(id: string): Promise<TeamDocument | null> {
    const query = TeamModel.findById(id)
      .populate('ownerId', 'firstName lastName email avatar')
      .populate('members.userId', 'firstName lastName email avatar')
      .lean();
    return timedQuery(query, { collection: 'teams', operation: 'findByIdWithMembers' });
  },

  /**
   * Create a new team document.
   */
  async create(data: Partial<TeamDocument>, session?: ClientSession): Promise<TeamDocument> {
    const doc = new TeamModel(data);
    return doc.save({ session });
  },

  /**
   * Update a team by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<TeamDocument>,
    session?: ClientSession
  ): Promise<TeamDocument | null> {
    const query = TeamModel.findByIdAndUpdate(id, data, { new: true, session })
      .select(buildListProjection())
      .lean();
    return timedQuery(query, { collection: 'teams', operation: 'updateById' });
  },

  /**
   * Delete a team by id. Returns true if a document was deleted.
   */
  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const result = await TeamModel.findByIdAndDelete(id, { session });
    return result !== null;
  },

  /**
   * Delete multiple teams matching a filter.
   */
  async deleteMany(filter: FilterQuery<TeamDocument>, session?: ClientSession): Promise<number> {
    const result = await TeamModel.deleteMany(filter, { session });
    return result.deletedCount ?? 0;
  },

  /**
   * Check whether a team with the given id exists.
   */
  async exists(id: string): Promise<boolean> {
    const doc = await TeamModel.exists({ _id: id });
    return doc !== null;
  },

  /**
   * Count teams matching the given filter.
   */
  async count(filter: TeamListFilter = {}): Promise<number> {
    return TeamModel.countDocuments(buildFilterQuery(filter));
  },

  /**
   * Add a member to a team. Returns the existing team if the user is
   * already an owner or member to prevent duplicates.
   */
  async addMember(
    teamId: string,
    userId: string,
    role = 'member',
    session?: ClientSession
  ): Promise<TeamDocument | null> {
    const team = await TeamModel.findById(teamId).lean();
    if (!team) return null;

    const isOwner = String(team.ownerId) === userId;
    const isMember = team.members.some((m) => String(m.userId) === userId);

    if (isOwner || isMember) {
      return team;
    }

    const query = TeamModel.findByIdAndUpdate(
      teamId,
      { $push: { members: { userId, role, joinedAt: new Date() } } },
      { new: true, session }
    ).lean();
    return timedQuery(query, { collection: 'teams', operation: 'addMember' });
  },

  /**
   * Remove a member from a team by userId.
   */
  async removeMember(
    teamId: string,
    userId: string,
    session?: ClientSession
  ): Promise<TeamDocument | null> {
    const query = TeamModel.findByIdAndUpdate(
      teamId,
      { $pull: { members: { userId } } },
      { new: true, session }
    ).lean();
    return timedQuery(query, { collection: 'teams', operation: 'removeMember' });
  },

  /**
   * Update a member's role within a team.
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    role: string,
    session?: ClientSession
  ): Promise<TeamDocument | null> {
    const query = TeamModel.findOneAndUpdate(
      { _id: teamId, 'members.userId': userId },
      { $set: { 'members.$.role': role } },
      { new: true, session }
    ).lean();
    return timedQuery(query, { collection: 'teams', operation: 'updateMemberRole' });
  },
};
