"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_controller_1 = require("./auth.controller");
const auth_validation_1 = require("./auth.validation");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', (0, validate_middleware_1.validateMiddleware)(auth_validation_1.registerSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.register));
exports.authRouter.post('/login', (0, validate_middleware_1.validateMiddleware)(auth_validation_1.loginSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.login));
exports.authRouter.post('/refresh', (0, validate_middleware_1.validateMiddleware)(auth_validation_1.refreshTokenSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.refresh));
exports.authRouter.post('/logout', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validateMiddleware)(auth_validation_1.logoutSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.logout));
exports.authRouter.get('/me', auth_middleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.me));
exports.authRouter.patch('/change-password', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validateMiddleware)(auth_validation_1.changePasswordSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.changePassword));
//# sourceMappingURL=auth.routes.js.map