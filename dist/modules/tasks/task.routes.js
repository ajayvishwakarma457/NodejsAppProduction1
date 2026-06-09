"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const task_controller_1 = require("./task.controller");
exports.taskRouter = (0, express_1.Router)();
exports.taskRouter.get("/", (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.list));
