"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const http_status_codes_1 = require("http-status-codes");
const auth_service_1 = require("./auth.service");
exports.authController = {
    async login(req, res) {
        const user = await auth_service_1.authService.login(req.body.email);
        res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: user });
    }
};
