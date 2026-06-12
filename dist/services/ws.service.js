"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = void 0;
const ws_1 = require("ws");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const token_service_1 = require("./token.service");
const helpers_1 = require("../ws/helpers");
const message_handler_1 = require("../ws/handlers/message.handler");
const HEARTBEAT_INTERVAL_MS = 30_000;
let wss = null;
let heartbeatInterval = null;
const clients = new Map();
const removeClient = (socket) => {
    const client = clients.get(socket);
    if (client) {
        clients.delete(socket);
        logger_1.logger.info('WS client disconnected', { userId: client.userId });
    }
};
const startHeartbeat = () => {
    if (heartbeatInterval)
        return;
    heartbeatInterval = setInterval(() => {
        for (const [socket, client] of clients.entries()) {
            if (!client.isAlive) {
                socket.terminate();
                removeClient(socket);
                continue;
            }
            client.isAlive = false;
            socket.ping();
        }
    }, HEARTBEAT_INTERVAL_MS);
};
const authenticate = (req) => {
    try {
        const host = req.headers.host || 'localhost';
        const url = new URL(req.url || '/', `http://${host}`);
        const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];
        if (!token)
            return null;
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        return payload.sub;
    }
    catch {
        return null;
    }
};
exports.wsService = {
    /**
     * Start the lightweight WebSocket server.
     */
    start(options = {}) {
        if (wss)
            return wss;
        const port = options.port ?? env_1.env.WS_PORT;
        wss = new ws_1.WebSocketServer({
            port: options.server ? undefined : port,
            server: options.server,
        });
        wss.on('connection', (socket, req) => {
            const userId = authenticate(req);
            if (!userId) {
                socket.close(1008, 'Authentication required');
                logger_1.logger.warn('WS connection rejected: invalid or missing token');
                return;
            }
            const client = { socket, userId, channels: new Set(), isAlive: true };
            clients.set(socket, client);
            socket.on('pong', () => {
                client.isAlive = true;
            });
            socket.on('message', (raw) => (0, message_handler_1.handleMessage)(client, raw));
            socket.on('close', () => removeClient(socket));
            socket.on('error', (err) => {
                logger_1.logger.error('WS client error', {
                    userId: client.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
            (0, helpers_1.sendMessage)(socket, 'connection:established', { userId });
            logger_1.logger.info('WS client connected', { userId });
        });
        wss.on('error', (err) => {
            logger_1.logger.error('WS server error', { error: err.message });
        });
        startHeartbeat();
        const address = wss.address();
        const listeningPort = address && typeof address === 'object' ? address.port : 'unknown';
        logger_1.logger.info('WS server started', { port: listeningPort });
        return wss;
    },
    /**
     * Stop the WebSocket server and close all connections.
     */
    stop() {
        return new Promise((resolve) => {
            if (!wss) {
                resolve();
                return;
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            for (const socket of clients.keys()) {
                socket.close(1001, 'Server shutting down');
                clients.delete(socket);
            }
            wss.close((err) => {
                if (err) {
                    logger_1.logger.error('WS server close error', { error: err.message });
                }
                wss = null;
                logger_1.logger.info('WS server stopped');
                resolve();
            });
        });
    },
    /**
     * Send an event to all sockets belonging to a specific user.
     */
    emitToUser(userId, event, payload) {
        for (const client of clients.values()) {
            if (client.userId === userId) {
                (0, helpers_1.sendMessage)(client.socket, event, payload);
            }
        }
    },
    /**
     * Send an event to all sockets subscribed to a channel.
     */
    emitToChannel(channel, event, payload) {
        for (const client of clients.values()) {
            if (client.channels.has(channel)) {
                (0, helpers_1.sendMessage)(client.socket, event, payload);
            }
        }
    },
    /**
     * Broadcast an event to every connected socket.
     */
    broadcast(event, payload) {
        for (const client of clients.values()) {
            (0, helpers_1.sendMessage)(client.socket, event, payload);
        }
    },
    /**
     * Get the current number of connected clients.
     */
    getClientCount() {
        return clients.size;
    },
};
//# sourceMappingURL=ws.service.js.map