"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const comment_controller_1 = require("./comment.controller");
exports.commentRouter = (0, express_1.Router)();
exports.commentRouter.get("/", (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.list));
