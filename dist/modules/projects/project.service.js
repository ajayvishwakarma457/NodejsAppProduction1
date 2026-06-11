"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
const pagination_1 = require("../../utils/pagination");
const ApiError_1 = require("../../utils/ApiError");
const rbac_1 = require("../../utils/rbac");
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
        return project_repository_1.projectRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
    },
    async getById(id) {
        return project_repository_1.projectRepository.findById(id);
    },
    async create(data) {
        return project_repository_1.projectRepository.create(data);
    },
    async update(id, data, userId, role) {
        const existing = await project_repository_1.projectRepository.findById(id);
        if (!existing)
            return null;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only update projects you own');
        }
        return project_repository_1.projectRepository.updateById(id, data);
    },
    async remove(id, userId, role) {
        const existing = await project_repository_1.projectRepository.findById(id);
        if (!existing)
            return false;
        if (!(0, rbac_1.isOwnerOrAdmin)(existing.ownerId, userId, role)) {
            throw ApiError_1.ApiError.forbidden('You can only delete projects you own');
        }
        return project_repository_1.projectRepository.deleteById(id);
    },
};
//# sourceMappingURL=project.service.js.map