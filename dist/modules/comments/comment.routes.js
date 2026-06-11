"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const comment_controller_1 = require("./comment.controller");
const comment_validation_1 = require("./comment.validation");
exports.commentRouter = (0, express_1.Router)();
exports.commentRouter.use(auth_middleware_1.authMiddleware);
exports.commentRouter.get('/', (0, validate_middleware_1.validateMiddleware)(comment_validation_1.listCommentsQuerySchema), (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.list));
exports.commentRouter.get('/:id', (0, validate_middleware_1.validateMiddleware)(comment_validation_1.commentIdParamSchema), (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.getById));
exports.commentRouter.post('/', (0, validate_middleware_1.validateMiddleware)(comment_validation_1.createCommentSchema), (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.create));
exports.commentRouter.patch('/:id', (0, validate_middleware_1.validateMiddleware)(comment_validation_1.updateCommentSchema), (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.update));
exports.commentRouter.delete('/:id', (0, validate_middleware_1.validateMiddleware)(comment_validation_1.commentIdParamSchema), (0, asyncHandler_1.asyncHandler)(comment_controller_1.commentController.remove));
//# sourceMappingURL=comment.routes.js.map