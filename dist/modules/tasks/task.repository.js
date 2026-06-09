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
    },
    async findDueInRange(start, end) {
        return task_model_1.TaskModel.find({
            status: { $nin: ["done"] },
            dueDate: { $gte: start, $lte: end }
        })
            .populate("assignedTo", "email firstName lastName")
            .lean();
    },
    async findOverdue(before) {
        return task_model_1.TaskModel.find({
            status: { $nin: ["done"] },
            dueDate: { $lt: before }
        })
            .populate("assignedTo", "email firstName lastName")
            .lean();
    }
};
