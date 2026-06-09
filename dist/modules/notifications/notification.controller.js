"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const notification_service_1 = require("./notification.service");
exports.notificationController = {
    async list(_req, res) {
        const notifications = await notification_service_1.notificationService.list();
        res.json({ success: true, data: notifications });
    }
};
