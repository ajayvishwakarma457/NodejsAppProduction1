"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRepository = void 0;
const task_model_1 = require("./task.model");
exports.taskRepository = {
    async findAll() {
        return task_model_1.TaskModel.find().lean();
    },
    async findById(id) {
        return task_model_1.TaskModel.findById(id).lean();
    }
};
