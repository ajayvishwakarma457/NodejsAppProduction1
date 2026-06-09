"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = void 0;
const constants_1 = require("./constants");
const getPagination = (page, limit) => {
    const safePage = Math.max(page ?? constants_1.APP_CONSTANTS.pagination.defaultPage, 1);
    const safeLimit = Math.min(Math.max(limit ?? constants_1.APP_CONSTANTS.pagination.defaultLimit, 1), constants_1.APP_CONSTANTS.pagination.maxLimit);
    return {
        page: safePage,
        limit: safeLimit,
        offset: (safePage - 1) * safeLimit
    };
};
exports.getPagination = getPagination;
