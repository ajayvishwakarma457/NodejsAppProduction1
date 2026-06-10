"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskController = void 0;
const http_status_codes_1 = require("http-status-codes");
const task_service_1 = require("./task.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.taskController = {
    async list(req, res) {
        const { data, meta } = await task_service_1.taskService.list(req.query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const task = await task_service_1.taskService.getById(req.params.id);
        if (!task) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Task not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(task).send(res);
    },
    async create(req, res) {
        const task = await task_service_1.taskService.create(req.body);
        ApiResponse_1.ApiResponse.created(task).send(res);
    },
    async update(req, res) {
        const task = await task_service_1.taskService.update(req.params.id, req.body);
        if (!task) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Task not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(task).send(res);
    },
    async remove(req, res) {
        const deleted = await task_service_1.taskService.remove(req.params.id);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Task not found"
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent().send(res);
    }
};
