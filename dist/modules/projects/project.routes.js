"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const project_controller_1 = require("./project.controller");
const project_validation_1 = require("./project.validation");
exports.projectRouter = (0, express_1.Router)();
exports.projectRouter.use(auth_middleware_1.authMiddleware);
exports.projectRouter.get('/', (0, validate_middleware_1.validateMiddleware)(project_validation_1.listProjectsQuerySchema), (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.list));
exports.projectRouter.get('/:id', (0, validate_middleware_1.validateMiddleware)(project_validation_1.projectIdParamSchema), (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.getById));
exports.projectRouter.post('/', (0, validate_middleware_1.validateMiddleware)(project_validation_1.createProjectSchema), (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.create));
exports.projectRouter.patch('/:id', (0, validate_middleware_1.validateMiddleware)(project_validation_1.updateProjectSchema), (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.update));
exports.projectRouter.delete('/:id', (0, validate_middleware_1.validateMiddleware)(project_validation_1.projectIdParamSchema), (0, asyncHandler_1.asyncHandler)(project_controller_1.projectController.remove));
//# sourceMappingURL=project.routes.js.map