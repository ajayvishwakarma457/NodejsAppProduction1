"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopWsServer = exports.startWsServer = void 0;
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ws_service_1 = require("../services/ws.service");
const startWsServer = () => {
    if (!env_1.env.WS_ENABLED) {
        logger_1.logger.info('WS server is disabled (WS_ENABLED=false)');
        return;
    }
    ws_service_1.wsService.start();
};
exports.startWsServer = startWsServer;
const stopWsServer = () => {
    return ws_service_1.wsService.stop();
};
exports.stopWsServer = stopWsServer;
//# sourceMappingURL=index.js.map