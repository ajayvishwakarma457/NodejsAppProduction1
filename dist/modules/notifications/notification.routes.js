"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const notification_controller_1 = require("./notification.controller");
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.get("/", (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.list));
