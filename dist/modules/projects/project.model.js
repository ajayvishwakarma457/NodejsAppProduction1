"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectModel = void 0;
const mongoose_1 = require("mongoose");
/* ------------------------------------------------------------------ */
// Schema
/* ------------------------------------------------------------------ */
const projectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active',
    },
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner id is required'],
    },
    teamId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Team',
        required: [true, 'Team id is required'],
    },
    startDate: {
        type: Date,
        default: null,
    },
    dueDate: {
        type: Date,
        default: null,
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
projectSchema.index({ ownerId: 1 }, { name: 'ownerid_idx' });
projectSchema.index({ teamId: 1 }, { name: 'teamid_idx' });
projectSchema.index({ status: 1 }, { name: 'status_idx' });
projectSchema.index({ createdAt: -1 }, { name: 'createdat_idx' });
// Text index for project search.
projectSchema.index({ name: 'text', description: 'text' }, { name: 'project_text_search_idx', weights: { name: 10, description: 5 } });
// Compound index for team dashboards filtered by status.
projectSchema.index({ teamId: 1, status: 1, createdAt: -1 }, { name: 'team_status_createdat_idx' });
// Compound index for owner listings filtered by status.
projectSchema.index({ ownerId: 1, status: 1, createdAt: -1 }, { name: 'owner_status_createdat_idx' });
// Compound index for overdue/completed analytics.
projectSchema.index({ status: 1, dueDate: 1 }, { name: 'status_duedate_idx' });
/* ------------------------------------------------------------------ */
// Virtuals
/* ------------------------------------------------------------------ */
projectSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.status === 'completed') {
        return false;
    }
    return new Date() > this.dueDate;
});
exports.ProjectModel = (0, mongoose_1.model)('Project', projectSchema);
//# sourceMappingURL=project.model.js.map