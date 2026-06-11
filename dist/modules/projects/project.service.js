"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
const pagination_1 = require("../../utils/pagination");
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
    async update(id, data) {
        return project_repository_1.projectRepository.updateById(id, data);
    },
    async remove(id) {
        return project_repository_1.projectRepository.deleteById(id);
    },
};
//# sourceMappingURL=project.service.js.map