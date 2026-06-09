"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskController = void 0;
const task_service_1 = require("./task.service");
exports.taskController = {
    async list(_req, res) {
        const tasks = await task_service_1.taskService.list();
        res.json({ success: true, data: tasks });
    }
};
