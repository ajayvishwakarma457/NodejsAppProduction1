"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = exports.NOTIFICATION_CHANNELS = exports.NOTIFICATION_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.NOTIFICATION_TYPES = [
    "task-assigned",
    "task-updated",
    "comment-added",
    "project-created",
    "mention",
    "due-soon",
    "invite"
];
exports.NOTIFICATION_CHANNELS = ["in-app", "email", "socket"];
const notificationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: exports.NOTIFICATION_TYPES,
        required: true
    },
    channels: {
        type: [String],
        enum: exports.NOTIFICATION_CHANNELS,
        default: ["in-app"]
    },
    isRead: { type: Boolean, default: false, index: true },
    status: {
        type: String,
        enum: ["pending", "delivered", "failed"],
        default: "pending"
    },
    scheduledAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
exports.NotificationModel = (0, mongoose_1.model)("Notification", notificationSchema);
