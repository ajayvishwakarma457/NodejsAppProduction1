import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { tokenService } from './token.service';
import { sendMessage } from '../ws/helpers';
import { handleMessage } from '../ws/handlers/message.handler';

export interface WSClient {
  socket: WebSocket;
  userId: string;
  channels: Set<string>;
  isAlive: boolean;
}

export interface WSMessage {
  event: string;
  payload?: unknown;
}

interface WSServerOptions {
  port?: number;
  server?: http.Server;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
const clients = new Map<WebSocket, WSClient>();

const removeClient = (socket: WebSocket): void => {
  const client = clients.get(socket);
  if (client) {
    clients.delete(socket);
    logger.info('WS client disconnected', { userId: client.userId });
  }
};

const startHeartbeat = (): void => {
  if (heartbeatInterval) return;

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

const authenticate = (req: http.IncomingMessage): string | null => {
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const token =
      url.searchParams.get('token') || (req.headers['sec-websocket-protocol'] as string);
    if (!token) return null;

    const payload = tokenService.verifyAccessToken(token);
    return payload.sub;
  } catch {
    return null;
  }
};

export const wsService = {
  /**
   * Start the lightweight WebSocket server.
   */
  start(options: WSServerOptions = {}): WebSocketServer {
    if (wss) return wss;

    const port = options.port ?? env.WS_PORT;
    wss = new WebSocketServer({
      port: options.server ? undefined : port,
      server: options.server,
    });

    wss.on('connection', (socket, req) => {
      const userId = authenticate(req);
      if (!userId) {
        socket.close(1008, 'Authentication required');
        logger.warn('WS connection rejected: invalid or missing token');
        return;
      }

      const client: WSClient = { socket, userId, channels: new Set(), isAlive: true };
      clients.set(socket, client);

      socket.on('pong', () => {
        client.isAlive = true;
      });

      socket.on('message', (raw) => handleMessage(client, raw));

      socket.on('close', () => removeClient(socket));

      socket.on('error', (err) => {
        logger.error('WS client error', {
          userId: client.userId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      sendMessage(socket, 'connection:established', { userId });
      logger.info('WS client connected', { userId });
    });

    wss.on('error', (err) => {
      logger.error('WS server error', { error: err.message });
    });

    startHeartbeat();

    const address = wss.address();
    const listeningPort = address && typeof address === 'object' ? address.port : 'unknown';
    logger.info('WS server started', { port: listeningPort });

    return wss;
  },

  /**
   * Stop the WebSocket server and close all connections.
   */
  stop(): Promise<void> {
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
          logger.error('WS server close error', { error: err.message });
        }
        wss = null;
        logger.info('WS server stopped');
        resolve();
      });
    });
  },

  /**
   * Send an event to all sockets belonging to a specific user.
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    for (const client of clients.values()) {
      if (client.userId === userId) {
        sendMessage(client.socket, event, payload);
      }
    }
  },

  /**
   * Send an event to all sockets subscribed to a channel.
   */
  emitToChannel(channel: string, event: string, payload: unknown): void {
    for (const client of clients.values()) {
      if (client.channels.has(channel)) {
        sendMessage(client.socket, event, payload);
      }
    }
  },

  /**
   * Broadcast an event to every connected socket.
   */
  broadcast(event: string, payload: unknown): void {
    for (const client of clients.values()) {
      sendMessage(client.socket, event, payload);
    }
  },

  /**
   * Get the current number of connected clients.
   */
  getClientCount(): number {
    return clients.size;
  },
};
