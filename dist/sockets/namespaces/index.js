"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNamespaces = void 0;
const logger_1 = require("../../config/logger");
const tasks_namespace_1 = require("./tasks.namespace");
const teams_namespace_1 = require("./teams.namespace");
const notifications_namespace_1 = require("./notifications.namespace");
/**
 * Register all Socket.IO namespaces.
 *
 * This is additive to the default namespace registered in `sockets/index.ts`.
 */
const initializeNamespaces = (io) => {
    (0, tasks_namespace_1.initializeTasksNamespace)(io);
    (0, teams_namespace_1.initializeTeamsNamespace)(io);
    (0, notifications_namespace_1.initializeNotificationsNamespace)(io);
    logger_1.logger.info('Socket.IO namespaces initialized');
};
exports.initializeNamespaces = initializeNamespaces;
//# sourceMappingURL=index.js.map