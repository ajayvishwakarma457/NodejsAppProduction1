"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const team_controller_1 = require("./team.controller");
exports.teamRouter = (0, express_1.Router)();
exports.teamRouter.get("/", (0, asyncHandler_1.asyncHandler)(team_controller_1.teamController.list));
