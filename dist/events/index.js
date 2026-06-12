"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEventBus = void 0;
const user_handler_1 = require("./handlers/user.handler");
const task_handler_1 = require("./handlers/task.handler");
const project_handler_1 = require("./handlers/project.handler");
const logger_1 = require("../config/logger");
let initialized = false;
/**
 * Register all application event handlers.
 *
 * Call this once during app bootstrap (after services are connected).
 * It is safe to call multiple times — subsequent calls are no-ops.
 */
const initializeEventBus = () => {
    if (initialized) {
        logger_1.logger.warn('Event bus already initialized');
        return;
    }
    (0, user_handler_1.registerUserEventHandlers)();
    (0, task_handler_1.registerTaskEventHandlers)();
    (0, project_handler_1.registerProjectEventHandlers)();
    initialized = true;
    logger_1.logger.info('Event bus initialized');
};
exports.initializeEventBus = initializeEventBus;
//# sourceMappingURL=index.js.map