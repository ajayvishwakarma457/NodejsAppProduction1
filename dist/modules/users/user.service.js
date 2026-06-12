"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_repository_1 = require("./user.repository");
const cache_1 = require("../../utils/cache");
const team_model_1 = require("../teams/team.model");
const project_model_1 = require("../projects/project.model");
const task_model_1 = require("../tasks/task.model");
const comment_model_1 = require("../comments/comment.model");
const notification_model_1 = require("../notifications/notification.model");
const api_key_repository_1 = require("../api-keys/api-key.repository");
const pagination_1 = require("../../utils/pagination");
const transaction_1 = require("../../utils/transaction");
const event_bus_1 = require("../../utils/event-bus");
exports.userService = {
    async list(query) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = {};
        if (query.role) {
            filter.role = String(query.role);
        }
        if (query.isVerified !== undefined) {
            filter.isVerified = Boolean(query.isVerified);
        }
        if (query.search) {
            filter.search = String(query.search);
        }
        return user_repository_1.userRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
    },
    async getById(id) {
        return cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.users, id, () => user_repository_1.userRepository.findById(id));
    },
    async create(data) {
        const created = await user_repository_1.userRepository.create(data);
        event_bus_1.eventBus.emit('user.created', {
            userId: created._id.toString(),
            email: String(created.email),
            firstName: String(created.firstName),
            lastName: String(created.lastName),
            role: String(created.role),
        });
        return created;
    },
    async update(id, data) {
        const updated = await user_repository_1.userRepository.updateById(id, data);
        if (updated) {
            await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.users, id);
            event_bus_1.eventBus.emit('user.updated', {
                userId: id,
                changes: Object.keys(data),
            });
        }
        return updated;
    },
    async remove(id) {
        const result = await (0, transaction_1.withTransaction)(async ({ session }) => {
            const userObjectId = new mongoose_1.default.Types.ObjectId(id);
            const ownedTeamIds = await team_model_1.TeamModel.distinct('_id', { ownerId: userObjectId }, { session: session ?? undefined });
            const memberTeamIds = await team_model_1.TeamModel.distinct('_id', { 'members.userId': userObjectId }, { session: session ?? undefined });
            const allTeamIds = Array.from(new Set([...ownedTeamIds, ...memberTeamIds]));
            const projectIds = await project_model_1.ProjectModel.distinct('_id', { $or: [{ ownerId: userObjectId }, { teamId: { $in: allTeamIds } }] }, { session: session ?? undefined });
            const taskIds = await task_model_1.TaskModel.distinct('_id', {
                $or: [
                    { createdBy: userObjectId },
                    { assignedTo: userObjectId },
                    { projectId: { $in: projectIds } },
                ],
            }, { session: session ?? undefined });
            await comment_model_1.CommentModel.deleteMany({
                $or: [{ userId: userObjectId }, { taskId: { $in: taskIds } }],
            }, { session: session ?? undefined });
            await task_model_1.TaskModel.deleteMany({
                $or: [
                    { createdBy: userObjectId },
                    { assignedTo: userObjectId },
                    { projectId: { $in: projectIds } },
                ],
            }, { session: session ?? undefined });
            await project_model_1.ProjectModel.deleteMany({
                $or: [{ ownerId: userObjectId }, { teamId: { $in: ownedTeamIds } }],
            }, { session: session ?? undefined });
            await team_model_1.TeamModel.deleteMany({ ownerId: userObjectId }, { session: session ?? undefined });
            await team_model_1.TeamModel.updateMany({ 'members.userId': userObjectId }, { $pull: { members: { userId: userObjectId } } }, { session: session ?? undefined });
            await notification_model_1.NotificationModel.deleteMany({ userId: userObjectId }, { session: session ?? undefined });
            await api_key_repository_1.apiKeyRepository.deleteMany({ userId: userObjectId }, session ?? undefined);
            const deleted = await user_repository_1.userRepository.deleteById(id, session ?? undefined);
            if (deleted) {
                await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.users, id);
            }
            return deleted;
        });
        if (result) {
            event_bus_1.eventBus.emit('user.deleted', { userId: id });
        }
        return result;
    },
};
//# sourceMappingURL=user.service.js.map