"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const project_controller_1 = require("./project.controller");
exports.projectRouter = (0, express_1.Router)();
exports.projectRouter.get("/", (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.list));
