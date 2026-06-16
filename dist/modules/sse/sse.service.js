"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseService = void 0;
const logger_1 = require("../../config/logger");
const HEARTBEAT_INTERVAL_MS = 30_000;
const globalClients = new Set();
const userClients = new Map();
let heartbeatInterval = null;
let messageId = 1;
const nextId = () => String(messageId++);
const formatMessage = (event, data, id) => {
    let message = '';
    if (event)
        message += `event: ${event}\n`;
    if (id)
        message += `id: ${id}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;
    return message;
};
const flush = (res) => {
    const flushable = res;
    if (typeof flushable.flush === 'function') {
        flushable.flush();
    }
};
const startHeartbeat = () => {
    if (heartbeatInterval)
        return;
    heartbeatInterval = setInterval(() => {
        const heartbeat = ':heartbeat\n\n';
        for (const res of globalClients) {
            res.write(heartbeat);
        }
    }, HEARTBEAT_INTERVAL_MS);
};
const sendToResponse = (res, event, data) => {
    res.write(formatMessage(event, data, nextId()));
    flush(res);
};
exports.sseService = {
    /**
     * Register an Express response as an SSE client.
     */
    addClient(res, userId) {
        globalClients.add(res);
        if (userId) {
            if (!userClients.has(userId)) {
                userClients.set(userId, new Set());
            }
            userClients.get(userId).add(res);
        }
        sendToResponse(res, 'connected', { userId });
        startHeartbeat();
        logger_1.logger.info('SSE client connected', { userId, totalClients: globalClients.size });
    },
    /**
     * Remove an Express response from the SSE client pool.
     */
    removeClient(res, userId) {
        globalClients.delete(res);
        if (userId) {
            const clients = userClients.get(userId);
            if (clients) {
                clients.delete(res);
                if (clients.size === 0) {
                    userClients.delete(userId);
                }
            }
        }
        logger_1.logger.info('SSE client disconnected', { userId, totalClients: globalClients.size });
    },
    /**
     * Send an event to all SSE clients belonging to a specific user.
     */
    emitToUser(userId, event, data) {
        const clients = userClients.get(userId);
        if (!clients || clients.size === 0)
            return;
        const message = formatMessage(event, data, nextId());
        for (const res of clients) {
            res.write(message);
            flush(res);
        }
    },
    /**
     * Broadcast an event to every connected SSE client.
     */
    broadcast(event, data) {
        const message = formatMessage(event, data, nextId());
        for (const res of globalClients) {
            res.write(message);
            flush(res);
        }
    },
    /**
     * Get the current number of connected SSE clients.
     */
    getClientCount() {
        return globalClients.size;
    },
    /**
     * Clear all clients and stop heartbeat. Useful for tests.
     */
    clear() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        globalClients.clear();
        userClients.clear();
    },
};
//# sourceMappingURL=sse.service.js.map