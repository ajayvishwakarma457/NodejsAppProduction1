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
    },
    async findDueInRange(start, end) {
        return task_repository_1.taskRepository.findDueInRange(start, end);
    },
    async findOverdue(before) {
        return task_repository_1.taskRepository.findOverdue(before);
    }
};
