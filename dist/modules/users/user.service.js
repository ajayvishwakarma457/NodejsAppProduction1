"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const user_repository_1 = require("./user.repository");
const pagination_1 = require("../../utils/pagination");
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
            order: pagination.order
        }, filter);
    },
    async getById(id) {
        return user_repository_1.userRepository.findById(id);
    },
    async create(data) {
        return user_repository_1.userRepository.create(data);
    },
    async update(id, data) {
        return user_repository_1.userRepository.updateById(id, data);
    },
    async remove(id) {
        return user_repository_1.userRepository.deleteById(id);
    }
};
