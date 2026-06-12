"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRepository = void 0;
const team_model_1 = require("./team.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
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
exports.teamRepository = {
    /**
     * Find all teams with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const listQuery = team_model_1.TeamModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'teams', operation: 'findAll' }),
            team_model_1.TeamModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a team by its MongoDB _id.
     */
    async findById(id) {
        const query = team_model_1.TeamModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'findById' });
    },
    /**
     * Find a team by id with owner and member details populated.
     */
    async findByIdWithMembers(id) {
        const query = team_model_1.TeamModel.findById(id)
            .populate('ownerId', 'firstName lastName email avatar')
            .populate('members.userId', 'firstName lastName email avatar')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'findByIdWithMembers' });
    },
    /**
     * Create a new team document.
     */
    async create(data, session) {
        const doc = new team_model_1.TeamModel(data);
        return doc.save({ session });
    },
    /**
     * Update a team by id. Returns the updated document or null if not found.
     */
    async updateById(id, data, session) {
        const query = team_model_1.TeamModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'updateById' });
    },
    /**
     * Delete a team by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await team_model_1.TeamModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple teams matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await team_model_1.TeamModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
    },
    /**
     * Check whether a team with the given id exists.
     */
    async exists(id) {
        const doc = await team_model_1.TeamModel.exists({ _id: id });
        return doc !== null;
    },
    /**
     * Count teams matching the given filter.
     */
    async count(filter = {}) {
        return team_model_1.TeamModel.countDocuments(buildFilterQuery(filter));
    },
    /**
     * Add a member to a team. Returns the existing team if the user is
     * already an owner or member to prevent duplicates.
     */
    async addMember(teamId, userId, role = 'member', session) {
        const team = await team_model_1.TeamModel.findById(teamId).lean();
        if (!team)
            return null;
        const isOwner = String(team.ownerId) === userId;
        const isMember = team.members.some((m) => String(m.userId) === userId);
        if (isOwner || isMember) {
            return team;
        }
        const query = team_model_1.TeamModel.findByIdAndUpdate(teamId, { $push: { members: { userId, role, joinedAt: new Date() } } }, { new: true, session }).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'addMember' });
    },
    /**
     * Remove a member from a team by userId.
     */
    async removeMember(teamId, userId, session) {
        const query = team_model_1.TeamModel.findByIdAndUpdate(teamId, { $pull: { members: { userId } } }, { new: true, session }).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'removeMember' });
    },
    /**
     * Update a member's role within a team.
     */
    async updateMemberRole(teamId, userId, role, session) {
        const query = team_model_1.TeamModel.findOneAndUpdate({ _id: teamId, 'members.userId': userId }, { $set: { 'members.$.role': role } }, { new: true, session }).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'teams', operation: 'updateMemberRole' });
    },
};
//# sourceMappingURL=team.repository.js.map