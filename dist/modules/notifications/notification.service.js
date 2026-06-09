"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
exports.notificationService = {
    async list() {
        return notification_repository_1.notificationRepository.findAll();
    }
};
