"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectModel = void 0;
const mongoose_1 = require("mongoose");
const projectSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ["active", "completed", "archived"],
        default: "active"
    },
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Team", required: true },
    startDate: { type: Date },
    dueDate: { type: Date }
}, {
    timestamps: true
});
exports.ProjectModel = (0, mongoose_1.model)("Project", projectSchema);
