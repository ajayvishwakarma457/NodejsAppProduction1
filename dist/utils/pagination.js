"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginationMeta = exports.getPagination = void 0;
const constants_1 = require("./constants");
const toSafeNumber = (value, fallback) => {
    const num = typeof value === "string" ? parseInt(value, 10) : Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
};
const getPagination = (page, limit, sort, order) => {
    const safePage = toSafeNumber(page, constants_1.PAGINATION.defaultPage);
    const safeLimit = Math.min(toSafeNumber(limit, constants_1.PAGINATION.defaultLimit), constants_1.PAGINATION.maxLimit);
    const safeSort = typeof sort === "string" && sort.trim().length > 0
        ? sort.trim()
        : constants_1.PAGINATION.defaultSort;
    const safeOrder = order === "desc" ? "desc" : "asc";
    return {
        page: safePage,
        limit: safeLimit,
        offset: (safePage - 1) * safeLimit,
        sort: safeSort,
        order: safeOrder
    };
};
exports.getPagination = getPagination;
const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
});
exports.buildPaginationMeta = buildPaginationMeta;
