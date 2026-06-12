"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = void 0;
const helpers_1 = require("../helpers");
const logger_1 = require("../../config/logger");
const handleMessage = (client, raw) => {
    try {
        const data = JSON.parse(raw.toString());
        const { event, payload } = data;
        if (event.startsWith('subscribe:')) {
            const channel = event.replace('subscribe:', '');
            client.channels.add(channel);
            (0, helpers_1.sendMessage)(client.socket, 'subscribed', { channel });
            logger_1.logger.debug('WS client subscribed', { userId: client.userId, channel });
            return;
        }
        if (event.startsWith('unsubscribe:')) {
            const channel = event.replace('unsubscribe:', '');
            client.channels.delete(channel);
            (0, helpers_1.sendMessage)(client.socket, 'unsubscribed', { channel });
            logger_1.logger.debug('WS client unsubscribed', { userId: client.userId, channel });
            return;
        }
        logger_1.logger.debug('WS message received', { userId: client.userId, event, payload });
    }
    catch (err) {
        (0, helpers_1.sendMessage)(client.socket, 'error', { message: 'Invalid JSON message' });
        logger_1.logger.warn('WS invalid message', {
            userId: client.userId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
};
exports.handleMessage = handleMessage;
//# sourceMappingURL=message.handler.js.map