"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
exports.authRepository = {
    async findByEmail(email) {
        return {
            id: "user-1",
            email,
            password: "secret",
            role: "admin"
        };
    }
};
