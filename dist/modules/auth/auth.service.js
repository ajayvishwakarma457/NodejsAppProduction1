"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const auth_repository_1 = require("./auth.repository");
const auth_utils_1 = require("./auth.utils");
exports.authService = {
    async login(email) {
        const user = await auth_repository_1.authRepository.findByEmail(email);
        if (!user) {
            return null;
        }
        return (0, auth_utils_1.sanitizeAuthUser)(user);
    }
};
