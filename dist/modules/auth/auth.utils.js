"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAuthUser = void 0;
const sanitizeAuthUser = (user) => {
    const { password, refreshToken, ...safeUser } = user;
    void password;
    void refreshToken;
    return safeUser;
};
exports.sanitizeAuthUser = sanitizeAuthUser;
