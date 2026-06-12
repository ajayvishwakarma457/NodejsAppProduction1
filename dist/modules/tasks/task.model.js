"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskModel = void 0;
const mongoose_1 = require("mongoose");
/* ------------------------------------------------------------------ */
// Schema
/* ------------------------------------------------------------------ */
const taskSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        required: [true, 'Task description is required'],
        trim: true,
        maxlength: [2000, 'Task description cannot exceed 2000 characters'],
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'done'],
        default: 'todo',
    },
    projectId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Project id is required'],
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator id is required'],
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assignee id is required'],
    },
    dueDate: {
        type: Date,
    },
    estimatedHours: {
        type: Number,
        default: 0,
        min: [0, 'Estimated hours cannot be negative'],
    },
    actualHours: {
        type: Number,
        default: 0,
        min: [0, 'Actual hours cannot be negative'],
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            delete ret.__v;
            ret.id = ret._id;
            delete ret._id;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform(_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
});
/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */
// Compound index for project dashboards filtered by status.
taskSchema.index({ projectId: 1, status: 1 }, { name: 'project_status_idx' });
// Compound index for user task boards filtered by status.
taskSchema.index({ assignedTo: 1, status: 1 }, { name: 'assignee_status_idx' });
// Compound index for reminder job queries (due tasks by status).
taskSchema.index({ status: 1, dueDate: 1 }, { name: 'status_duedate_idx' });
// Index for creator lookups.
taskSchema.index({ createdBy: 1 }, { name: 'creator_idx' });
// Index for date-based sorting and overdue queries.
taskSchema.index({ dueDate: 1 }, { name: 'duedate_idx' });
// Text index for task search.
taskSchema.index({ title: 'text', description: 'text' }, { name: 'task_text_search_idx', weights: { title: 10, description: 5 } });
// Compound index for assignee task boards with status and priority.
taskSchema.index({ assignedTo: 1, status: 1, priority: 1, dueDate: 1 }, { name: 'assignee_status_priority_duedate_idx' });
// Compound index for project task listings with status.
taskSchema.index({ projectId: 1, status: 1, priority: 1, createdAt: -1 }, { name: 'project_status_priority_createdat_idx' });
// Compound index for creator listings.
taskSchema.index({ createdBy: 1, status: 1, createdAt: -1 }, { name: 'creator_status_createdat_idx' });
// Compound index for reminder and overdue scans.
taskSchema.index({ status: 1, dueDate: 1, assignedTo: 1 }, { name: 'status_duedate_assignee_idx' });
exports.TaskModel = (0, mongoose_1.model)('Task', taskSchema);
//# sourceMappingURL=task.model.js.map