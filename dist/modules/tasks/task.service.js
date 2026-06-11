"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const task_repository_1 = require("./task.repository");
const pagination_1 = require("../../utils/pagination");
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
        return task_repository_1.taskRepository.findById(id);
    },
    async create(data) {
        return task_repository_1.taskRepository.create(data);
    },
    async update(id, data) {
        return task_repository_1.taskRepository.updateById(id, data);
    },
    async remove(id) {
        return task_repository_1.taskRepository.deleteById(id);
    },
    async findDueInRange(start, end) {
        return task_repository_1.taskRepository.findDueInRange(start, end);
    },
    async findOverdue(before) {
        return task_repository_1.taskRepository.findOverdue(before);
    },
};
//# sourceMappingURL=task.service.js.map