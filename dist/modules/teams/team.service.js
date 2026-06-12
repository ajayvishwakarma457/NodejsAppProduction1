"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamService = void 0;
const team_repository_1 = require("./team.repository");
const project_model_1 = require("../projects/project.model");
const task_model_1 = require("../tasks/task.model");
const comment_model_1 = require("../comments/comment.model");
const pagination_1 = require("../../utils/pagination");
const ApiError_1 = require("../../utils/ApiError");
const rbac_1 = require("../../utils/rbac");
const transaction_1 = require("../../utils/transaction");
exports.teamService = {
    async list(query) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = {};
        if (query.ownerId) {
            filter.ownerId = String(query.ownerId);
        }
        if (query.memberId) {
            filter.memberId = String(query.memberId);
        }
        if (query.search) {
            filter.search = String(query.search);
        }
        return team_repository_1.teamRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
    },
    async getById(id) {
        return team_repository_1.teamRepository.findById(id);
    },
    async create(data) {
        const ownerId = String(data.ownerId);
        return (0, transaction_1.withTransaction)(async ({ session }) => {
            const team = await team_repository_1.teamRepository.create(data, session ?? undefined);
            await team_repository_1.teamRepository.addMember(String(team._id), ownerId, 'owner', session ?? undefined);
            return team_repository_1.teamRepository.findById(String(team._id));
        });
    },
    async update(id, data, userId, role) {
        const existing = await team_repository_1.teamRepository.findById(id);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only update teams you own');
        }
        return team_repository_1.teamRepository.updateById(id, data);
    },
    async remove(id, userId, role) {
        const existing = await team_repository_1.teamRepository.findById(id);
        if (!existing)
            return false;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only delete teams you own');
        }
        return (0, transaction_1.withTransaction)(async ({ session }) => {
            const projectIds = await project_model_1.ProjectModel.distinct('_id', { teamId: id }, { session });
            const taskIds = await task_model_1.TaskModel.distinct('_id', { projectId: { $in: projectIds } }, { session });
            await comment_model_1.CommentModel.deleteMany({ taskId: { $in: taskIds } }, { session: session ?? undefined });
            await task_model_1.TaskModel.deleteMany({ projectId: { $in: projectIds } }, { session: session ?? undefined });
            await project_model_1.ProjectModel.deleteMany({ teamId: id }, { session: session ?? undefined });
            const result = await team_repository_1.teamRepository.deleteById(id, session ?? undefined);
            return result;
        });
    },
    async addMember(teamId, userId, role, requesterId, requesterRole) {
        const existing = await team_repository_1.teamRepository.findById(teamId);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, requesterId, requesterRole)) {
            throw ApiError_1.ApiError.forbidden('Only team owners can add members');
        }
        return team_repository_1.teamRepository.addMember(teamId, userId, role);
    },
    async removeMember(teamId, userId, requesterId, requesterRole) {
        const existing = await team_repository_1.teamRepository.findById(teamId);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, requesterId, requesterRole)) {
            throw ApiError_1.ApiError.forbidden('Only team owners can remove members');
        }
        return team_repository_1.teamRepository.removeMember(teamId, userId);
    },
};
//# sourceMappingURL=team.service.js.map