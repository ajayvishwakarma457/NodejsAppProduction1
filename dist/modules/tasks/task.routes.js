"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const task_controller_1 = require("./task.controller");
const task_validation_1 = require("./task.validation");
exports.taskRouter = (0, express_1.Router)();
exports.taskRouter.use(auth_middleware_1.authMiddleware);
exports.taskRouter.get('/dashboard', (0, validate_middleware_1.validateMiddleware)(task_validation_1.dashboardTasksQuerySchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.dashboard));
exports.taskRouter.get('/', (0, validate_middleware_1.validateMiddleware)(task_validation_1.listTasksQuerySchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.list));
exports.taskRouter.get('/:id', (0, validate_middleware_1.validateMiddleware)(task_validation_1.taskIdParamSchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.getById));
exports.taskRouter.post('/', (0, validate_middleware_1.validateMiddleware)(task_validation_1.createTaskSchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.create));
exports.taskRouter.patch('/:id', (0, validate_middleware_1.validateMiddleware)(task_validation_1.updateTaskSchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.update));
exports.taskRouter.delete('/:id', (0, validate_middleware_1.validateMiddleware)(task_validation_1.taskIdParamSchema), (0, asyncHandler_1.asyncHandler)(task_controller_1.taskController.remove));
//# sourceMappingURL=task.routes.js.map