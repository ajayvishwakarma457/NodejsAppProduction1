"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const notification_model_1 = require("./notification.model");
exports.notificationRepository = {
    async findAll() {
        return notification_model_1.NotificationModel.find().lean();
    }
};
