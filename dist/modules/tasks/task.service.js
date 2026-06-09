"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const task_repository_1 = require("./task.repository");
exports.taskService = {
    async list() {
        return task_repository_1.taskRepository.findAll();
    },
    async findById(id) {
        return task_repository_1.taskRepository.findById(id);
    }
};
