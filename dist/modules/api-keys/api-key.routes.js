"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const api_key_controller_1 = require("./api-key.controller");
const api_key_validation_1 = require("./api-key.validation");
exports.apiKeyRouter = (0, express_1.Router)();
exports.apiKeyRouter.post('/', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validateMiddleware)(api_key_validation_1.createApiKeySchema), (0, asyncHandler_1.asyncHandler)(api_key_controller_1.apiKeyController.create));
exports.apiKeyRouter.get('/', auth_middleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(api_key_controller_1.apiKeyController.list));
exports.apiKeyRouter.delete('/:id', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validateMiddleware)(api_key_validation_1.revokeApiKeySchema), (0, asyncHandler_1.asyncHandler)(api_key_controller_1.apiKeyController.revoke));
//# sourceMappingURL=api-key.routes.js.map