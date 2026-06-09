"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
exports.tokenService = {
    generateAccessToken(userId) {
        return `access-${userId}`;
    },
    generateRefreshToken(userId) {
        return `refresh-${userId}`;
    }
};
