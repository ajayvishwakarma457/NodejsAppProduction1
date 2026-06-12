"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectEventHandlers = void 0;
const event_bus_1 = require("../../utils/event-bus");
const logger_1 = require("../../config/logger");
const registerProjectEventHandlers = () => {
    event_bus_1.eventBus.on('project.created', ({ projectId, ownerId, name }) => {
        logger_1.logger.info('Event received: project.created', { projectId, ownerId, name });
    });
};
exports.registerProjectEventHandlers = registerProjectEventHandlers;
//# sourceMappingURL=project.handler.js.map