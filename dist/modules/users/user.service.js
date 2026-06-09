"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const user_repository_1 = require("./user.repository");
exports.userService = {
    async list() {
        return user_repository_1.userRepository.findAll();
    }
};
