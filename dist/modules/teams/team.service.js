"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamService = void 0;
const team_repository_1 = require("./team.repository");
const pagination_1 = require("../../utils/pagination");
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
            order: pagination.order
        }, filter);
    },
    async getById(id) {
        return team_repository_1.teamRepository.findById(id);
    },
    async create(data) {
        return team_repository_1.teamRepository.create(data);
    },
    async update(id, data) {
        return team_repository_1.teamRepository.updateById(id, data);
    },
    async remove(id) {
        return team_repository_1.teamRepository.deleteById(id);
    },
    async addMember(teamId, userId, role) {
        return team_repository_1.teamRepository.addMember(teamId, userId, role);
    },
    async removeMember(teamId, userId) {
        return team_repository_1.teamRepository.removeMember(teamId, userId);
    }
};
