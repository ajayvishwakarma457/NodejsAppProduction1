"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const http_status_codes_1 = require("http-status-codes");
const user_service_1 = require("./user.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.userController = {
    async list(req, res) {
        const { data, meta } = await user_service_1.userService.list(req.query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const user = await user_service_1.userService.getById(req.params.id);
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(user).send(res);
    },
    async create(req, res) {
        const user = await user_service_1.userService.create(req.body);
        ApiResponse_1.ApiResponse.created(user).send(res);
    },
    async update(req, res) {
        const user = await user_service_1.userService.update(req.params.id, req.body);
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(user).send(res);
    },
    async remove(req, res) {
        const deleted = await user_service_1.userService.remove(req.params.id);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent().send(res);
    }
};
