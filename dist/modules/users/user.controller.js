"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("./user.service");
exports.userController = {
    async list(_req, res) {
        const users = await user_service_1.userService.list();
        res.json({ success: true, data: users });
    }
};
