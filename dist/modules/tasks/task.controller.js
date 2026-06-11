"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskController = void 0;
const http_status_codes_1 = require("http-status-codes");
const task_service_1 = require("./task.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const rbac_1 = require("../../utils/rbac");
exports.taskController = {
    async list(req, res) {
        const query = req.query;
        // Non-admins only see tasks they created or are assigned to
        if (!(0, rbac_1.isAdmin)(req.user.role)) {
            query.createdBy = req.user.id;
        }
        const { data, meta } = await task_service_1.taskService.list(query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const task = await task_service_1.taskService.getById(req.params.id);
        if (!task) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Task not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(task).send(res);
    },
    async create(req, res) {
        const body = { ...req.body, createdBy: req.user.id };
        const task = await task_service_1.taskService.create(body);
        ApiResponse_1.ApiResponse.created(task).send(res);
    },
    async update(req, res) {
        const task = await task_service_1.taskService.update(req.params.id, req.body, req.user.id, req.user.role);
        if (!task) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Task not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(task).send(res);
    },
    async remove(req, res) {
        const deleted = await task_service_1.taskService.remove(req.params.id, req.user.id, req.user.role);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Task not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent().send(res);
    },
};
//# sourceMappingURL=task.controller.js.map