import { Response } from 'express';
import { logger } from '../../config/logger';

const HEARTBEAT_INTERVAL_MS = 30_000;

const globalClients = new Set<Response>();
const userClients = new Map<string, Set<Response>>();
let heartbeatInterval: NodeJS.Timeout | null = null;
let messageId = 1;

const nextId = (): string => String(messageId++);

const formatMessage = (event: string, data: unknown, id?: string): string => {
  let message = '';
  if (event) message += `event: ${event}\n`;
  if (id) message += `id: ${id}\n`;
  message += `data: ${JSON.stringify(data)}\n\n`;
  return message;
};

const flush = (res: Response): void => {
  const flushable = res as unknown as { flush?: () => void };
  if (typeof flushable.flush === 'function') {
    flushable.flush();
  }
};

const startHeartbeat = (): void => {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    const heartbeat = ':heartbeat\n\n';
    for (const res of globalClients) {
      res.write(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);
};

const sendToResponse = (res: Response, event: string, data: unknown): void => {
  res.write(formatMessage(event, data, nextId()));
  flush(res);
};

export const sseService = {
  /**
   * Register an Express response as an SSE client.
   */
  addClient(res: Response, userId?: string): void {
    globalClients.add(res);

    if (userId) {
      if (!userClients.has(userId)) {
        userClients.set(userId, new Set());
      }
      userClients.get(userId)!.add(res);
    }

    sendToResponse(res, 'connected', { userId });
    startHeartbeat();

    logger.info('SSE client connected', { userId, totalClients: globalClients.size });
  },

  /**
   * Remove an Express response from the SSE client pool.
   */
  removeClient(res: Response, userId?: string): void {
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

    logger.info('SSE client disconnected', { userId, totalClients: globalClients.size });
  },

  /**
   * Send an event to all SSE clients belonging to a specific user.
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    const clients = userClients.get(userId);
    if (!clients || clients.size === 0) return;

    const message = formatMessage(event, data, nextId());
    for (const res of clients) {
      res.write(message);
      flush(res);
    }
  },

  /**
   * Broadcast an event to every connected SSE client.
   */
  broadcast(event: string, data: unknown): void {
    const message = formatMessage(event, data, nextId());
    for (const res of globalClients) {
      res.write(message);
      flush(res);
    }
  },

  /**
   * Get the current number of connected SSE clients.
   */
  getClientCount(): number {
    return globalClients.size;
  },

  /**
   * Clear all clients and stop heartbeat. Useful for tests.
   */
  clear(): void {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    globalClients.clear();
    userClients.clear();
  },
};
