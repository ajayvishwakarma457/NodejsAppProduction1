"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const http_status_codes_1 = require("http-status-codes");
const user_service_1 = require("./user.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const rbac_1 = require("../../utils/rbac");
exports.userController = {
    async list(req, res) {
        const { data, meta } = await user_service_1.userService.list(req.query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const targetId = req.params.id;
        const currentUserId = req.user.id;
        const currentRole = req.user.role;
        if (!(0, rbac_1.isOwnerOrAdmin)(targetId, currentUserId, currentRole)) {
            throw ApiError_1.ApiError.forbidden('You can only view your own profile or require admin access');
        }
        const user = await user_service_1.userService.getById(targetId);
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
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
        const targetId = req.params.id;
        const currentUserId = req.user.id;
        const currentRole = req.user.role;
        if (!(0, rbac_1.isOwnerOrAdmin)(targetId, currentUserId, currentRole)) {
            throw ApiError_1.ApiError.forbidden('You can only update your own profile or require admin access');
        }
        // Non-admins cannot change their own role
        const body = { ...req.body };
        if (!(0, rbac_1.isAdmin)(currentRole)) {
            delete body.role;
        }
        const user = await user_service_1.userService.update(targetId, body);
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
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
                message: 'User not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent().send(res);
    },
};
//# sourceMappingURL=user.controller.js.map