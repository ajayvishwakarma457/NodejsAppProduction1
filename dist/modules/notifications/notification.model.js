"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ["task-assigned", "task-updated", "comment-added", "project-created"],
        required: true
    },
    isRead: { type: Boolean, default: false }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
exports.NotificationModel = (0, mongoose_1.model)("Notification", notificationSchema);
