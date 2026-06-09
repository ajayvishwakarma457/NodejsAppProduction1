"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskModel = void 0;
const mongoose_1 = require("mongoose");
const taskSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["todo", "in-progress", "review", "done"],
        default: "todo"
    },
    projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 }
}, {
    timestamps: true
});
exports.TaskModel = (0, mongoose_1.model)("Task", taskSchema);
