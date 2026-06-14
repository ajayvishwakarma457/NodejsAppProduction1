"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
const cache_1 = require("../../utils/cache");
const task_model_1 = require("../tasks/task.model");
const comment_model_1 = require("../comments/comment.model");
const pagination_1 = require("../../utils/pagination");
const ApiError_1 = require("../../utils/ApiError");
const rbac_1 = require("../../utils/rbac");
const serializer_1 = require("../../utils/serializer");
const transaction_1 = require("../../utils/transaction");
const event_bus_1 = require("../../utils/event-bus");
exports.projectService = {
    async list(query) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = {};
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
        const result = await project_repository_1.projectRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
        return {
            ...result,
            data: (0, serializer_1.serializeDocuments)(result.data),
        };
    },
    async getById(id) {
        const project = await cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.projects, id, () => project_repository_1.projectRepository.findById(id));
        return (0, serializer_1.serializeDocument)(project);
    },
    async create(data) {
        const created = await project_repository_1.projectRepository.create(data);
        await cache_1.cacheAside.invalidatePattern(cache_1.CACHE_NAMESPACE.projects, 'list:*');
        event_bus_1.eventBus.emit('project.created', {
            projectId: created._id.toString(),
            ownerId: String(created.ownerId ?? data.ownerId ?? ''),
            name: String(created.name),
        });
        return (0, serializer_1.serializeDocument)(created);
    },
    async update(id, data, userId, role) {
        const existing = await project_repository_1.projectRepository.findById(id);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only update projects you own');
        }
        const updated = await project_repository_1.projectRepository.updateById(id, data);
        if (updated) {
            await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.projects, id);
        }
        return (0, serializer_1.serializeDocument)(updated);
    },
    async remove(id, userId, role) {
        const existing = await project_repository_1.projectRepository.findById(id);
        if (!existing)
            return false;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only delete projects you own');
        }
        return (0, transaction_1.withTransaction)(async ({ session }) => {
            const taskIds = await task_model_1.TaskModel.distinct('_id', { projectId: id }, { session });
            await comment_model_1.CommentModel.deleteMany({ taskId: { $in: taskIds } }, { session: session ?? undefined });
            await task_model_1.TaskModel.deleteMany({ projectId: id }, { session: session ?? undefined });
            const deleted = await project_repository_1.projectRepository.deleteById(id, session ?? undefined);
            if (deleted) {
                await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.projects, id);
            }
            return deleted;
        });
    },
    async getDashboard(userId, role) {
        const scopedUserId = (0, rbac_1.isAdmin)(role) ? undefined : userId;
        const [statusDistribution, taskSummary] = await Promise.all([
            project_repository_1.projectRepository.getStatusDistribution(scopedUserId),
            project_repository_1.projectRepository.getProjectTaskSummary(scopedUserId),
        ]);
        return {
            statusDistribution,
            taskSummary,
        };
    },
};
//# sourceMappingURL=project.service.js.map