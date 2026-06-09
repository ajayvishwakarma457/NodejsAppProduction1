"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
const constants_1 = require("../utils/constants");
exports.tokenService = {
    generateAccessToken(userId) {
        return `${constants_1.TOKEN_PREFIX.access}${userId}`;
    },
    generateRefreshToken(userId) {
        return `${constants_1.TOKEN_PREFIX.refresh}${userId}`;
    }
};
