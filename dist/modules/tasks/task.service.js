"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const task_repository_1 = require("./task.repository");
const cache_1 = require("../../utils/cache");
const comment_model_1 = require("../comments/comment.model");
const pagination_1 = require("../../utils/pagination");
const ApiError_1 = require("../../utils/ApiError");
const rbac_1 = require("../../utils/rbac");
const transaction_1 = require("../../utils/transaction");
const event_bus_1 = require("../../utils/event-bus");
exports.taskService = {
    async list(query) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = {};
        if (query.projectId) {
            filter.projectId = String(query.projectId);
        }
        if (query.assignedTo) {
            filter.assignedTo = String(query.assignedTo);
        }
        if (query.createdBy) {
            filter.createdBy = String(query.createdBy);
        }
        if (query.status) {
            filter.status = String(query.status);
        }
        if (query.priority) {
            filter.priority = String(query.priority);
        }
        if (query.search) {
            filter.search = String(query.search);
        }
        return task_repository_1.taskRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
    },
    async getById(id) {
        return cache_1.cacheAside.getOrSet(cache_1.CACHE_NAMESPACE.tasks, id, () => task_repository_1.taskRepository.findById(id));
    },
    async create(data) {
        const created = await task_repository_1.taskRepository.create(data);
        await cache_1.cacheAside.invalidatePattern(cache_1.CACHE_NAMESPACE.tasks, 'list:*');
        const taskId = created._id.toString();
        const createdBy = String(created.createdBy ?? data.createdBy ?? '');
        event_bus_1.eventBus.emit('task.created', { taskId, createdBy });
        if (created.assignedTo) {
            event_bus_1.eventBus.emit('task.assigned', {
                taskId,
                userId: String(created.assignedTo),
                title: String(created.title),
                assignedBy: createdBy,
            });
        }
        return created;
    },
    async update(id, data, userId, role) {
        const existing = await task_repository_1.taskRepository.findById(id);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.createdBy, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only update tasks you created');
        }
        const previousAssignee = existing.assignedTo ? String(existing.assignedTo) : undefined;
        const updated = await task_repository_1.taskRepository.updateById(id, data);
        if (updated) {
            await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.tasks, id);
            const newAssignee = data.assignedTo ? String(data.assignedTo) : undefined;
            if (newAssignee && newAssignee !== previousAssignee) {
                event_bus_1.eventBus.emit('task.assigned', {
                    taskId: id,
                    userId: newAssignee,
                    title: String(updated.title),
                    assignedBy: userId,
                });
            }
        }
        return updated;
    },
    async remove(id, userId, role) {
        const existing = await task_repository_1.taskRepository.findById(id);
        if (!existing)
            return false;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.createdBy, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only delete tasks you created');
        }
        return (0, transaction_1.withTransaction)(async ({ session }) => {
            await comment_model_1.CommentModel.deleteMany({ taskId: id }, { session: session ?? undefined });
            const deleted = await task_repository_1.taskRepository.deleteById(id, session ?? undefined);
            if (deleted) {
                await cache_1.cacheAside.invalidateEntity(cache_1.CACHE_NAMESPACE.tasks, id);
            }
            return deleted;
        });
    },
    async findDueInRange(start, end) {
        return task_repository_1.taskRepository.findDueInRange(start, end);
    },
    async findOverdue(before) {
        return task_repository_1.taskRepository.findOverdue(before);
    },
    async getDashboard(userId, role) {
        const scopedUserId = (0, rbac_1.isAdmin)(role) ? undefined : userId;
        const [statusDistribution, priorityDistribution, overdueSummary, workload] = await Promise.all([
            task_repository_1.taskRepository.getStatusDistribution(scopedUserId),
            task_repository_1.taskRepository.getPriorityDistribution(scopedUserId),
            task_repository_1.taskRepository.getOverdueSummary(scopedUserId),
            task_repository_1.taskRepository.getWorkloadByUser(scopedUserId, 10),
        ]);
        return {
            statusDistribution,
            priorityDistribution,
            overdueSummary,
            workload,
        };
    },
};
//# sourceMappingURL=task.service.js.map