"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.use(auth_middleware_1.authMiddleware);
exports.userRouter.get('/', (0, role_middleware_1.roleMiddleware)('admin'), (0, validate_middleware_1.validateMiddleware)(user_validation_1.listUsersQuerySchema), (0, asyncHandler_1.asyncHandler)(user_controller_1.userController.list));
exports.userRouter.get('/:id', (0, validate_middleware_1.validateMiddleware)(user_validation_1.userIdParamSchema), (0, asyncHandler_1.asyncHandler)(user_controller_1.userController.getById));
exports.userRouter.post('/', (0, role_middleware_1.roleMiddleware)('admin'), (0, validate_middleware_1.validateMiddleware)(user_validation_1.createUserSchema), (0, asyncHandler_1.asyncHandler)(user_controller_1.userController.create));
exports.userRouter.patch('/:id', (0, validate_middleware_1.validateMiddleware)(user_validation_1.updateUserSchema), (0, asyncHandler_1.asyncHandler)(user_controller_1.userController.update));
exports.userRouter.delete('/:id', (0, role_middleware_1.roleMiddleware)('admin'), (0, validate_middleware_1.validateMiddleware)(user_validation_1.userIdParamSchema), (0, asyncHandler_1.asyncHandler)(user_controller_1.userController.remove));
//# sourceMappingURL=user.routes.js.map