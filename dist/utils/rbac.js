"use strict";
/**
 * RBAC helpers for ownership and role checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOwnerOrAdmin = exports.isAdmin = void 0;
const isAdmin = (role) => role === 'admin';
exports.isAdmin = isAdmin;
const isOwnerOrAdmin = (resourceOwnerId, userId, role) => {
    if ((0, exports.isAdmin)(role))
        return true;
    return String(resourceOwnerId) === userId;
};
exports.isOwnerOrAdmin = isOwnerOrAdmin;
//# sourceMappingURL=rbac.js.map