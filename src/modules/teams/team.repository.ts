import { FilterQuery } from "mongoose";
import { TeamDocument, TeamModel } from "./team.model";
import { buildPaginationMeta, PaginationMeta } from "../../utils/pagination";

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
  order: "asc" | "desc";
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
    query.$or = [
      { ownerId: filter.memberId },
      { "members.userId": filter.memberId }
    ];
  }

  if (filter.search) {
    query.name = { $regex: filter.search, $options: "i" };
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
  async findAll(
    options: TeamListOptions,
    filter: TeamListFilter = {}
  ): Promise<TeamListResult> {
    const query = buildFilterQuery(filter);
    const skip = (options.page - 1) * options.limit;
    const sortDirection = options.order === "desc" ? -1 : 1;

    const [data, total] = await Promise.all([
      TeamModel.find(query)
        .sort({ [options.sort]: sortDirection })
        .skip(skip)
        .limit(options.limit)
        .lean(),
      TeamModel.countDocuments(query)
    ]);

    return {
      data,
      meta: buildPaginationMeta(options.page, options.limit, total)
    };
  },

  /**
   * Find a team by its MongoDB _id.
   */
  async findById(id: string): Promise<TeamDocument | null> {
    return TeamModel.findById(id).lean();
  },

  /**
   * Find a team by id with owner and member details populated.
   */
  async findByIdWithMembers(id: string): Promise<TeamDocument | null> {
    return TeamModel.findById(id)
      .populate("ownerId", "firstName lastName email avatar")
      .populate("members.userId", "firstName lastName email avatar")
      .lean();
  },

  /**
   * Create a new team document.
   */
  async create(data: Partial<TeamDocument>): Promise<TeamDocument> {
    return TeamModel.create(data);
  },

  /**
   * Update a team by id. Returns the updated document or null if not found.
   */
  async updateById(
    id: string,
    data: Partial<TeamDocument>
  ): Promise<TeamDocument | null> {
    return TeamModel.findByIdAndUpdate(id, data, { new: true }).lean();
  },

  /**
   * Delete a team by id. Returns true if a document was deleted.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await TeamModel.findByIdAndDelete(id);
    return result !== null;
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
    role = "member"
  ): Promise<TeamDocument | null> {
    const team = await TeamModel.findById(teamId).lean();
    if (!team) return null;

    const isOwner = String(team.ownerId) === userId;
    const isMember = team.members.some(
      (m) => String(m.userId) === userId
    );

    if (isOwner || isMember) {
      return team;
    }

    return TeamModel.findByIdAndUpdate(
      teamId,
      { $push: { members: { userId, role, joinedAt: new Date() } } },
      { new: true }
    ).lean();
  },

  /**
   * Remove a member from a team by userId.
   */
  async removeMember(
    teamId: string,
    userId: string
  ): Promise<TeamDocument | null> {
    return TeamModel.findByIdAndUpdate(
      teamId,
      { $pull: { members: { userId } } },
      { new: true }
    ).lean();
  },

  /**
   * Update a member's role within a team.
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    role: string
  ): Promise<TeamDocument | null> {
    return TeamModel.findOneAndUpdate(
      { _id: teamId, "members.userId": userId },
      { $set: { "members.$.role": role } },
      { new: true }
    ).lean();
  }
};
