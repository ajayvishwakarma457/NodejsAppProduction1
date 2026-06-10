"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const user_repository_1 = require("../users/user.repository");
exports.authRepository = {
    async findByEmail(email) {
        return user_repository_1.userRepository.findByEmailWithPassword(email);
    }
};
