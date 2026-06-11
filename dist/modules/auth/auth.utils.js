"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAuthUser = void 0;
const sanitizeAuthUser = (user) => {
    const u = user;
    return {
        id: String(u._id ?? u.id),
        firstName: String(u.firstName),
        lastName: String(u.lastName),
        email: String(u.email),
        role: String(u.role),
        avatar: u.avatar ?? null,
        isVerified: Boolean(u.isVerified),
        lastLogin: u.lastLogin ?? null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
    };
};
exports.sanitizeAuthUser = sanitizeAuthUser;
//# sourceMappingURL=auth.utils.js.map