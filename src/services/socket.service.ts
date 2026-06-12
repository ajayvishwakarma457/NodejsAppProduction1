import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { SOCKET_ROOM_PREFIX } from '../utils/constants';
import { wsService } from './ws.service';
import { sseService } from './sse.service';

let ioInstance: Server | null = null;

const ensureInitialized = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call setIO() first.');
  }
  return ioInstance;
};

export const socketService = {
  setIO(io: Server) {
    if (ioInstance) {
      logger.warn('Socket.IO instance is being overwritten');
    }
    ioInstance = io;
  },

  getIO(): Server {
    return ensureInitialized();
  },

  emitToRoom(room: string, event: string, data: unknown): void {
    const io = ensureInitialized();
    io.to(room).emit(event, data);
  },

  /**
   * Broadcast to a room inside a specific namespace.
   */
  emitToNamespace(namespace: string, room: string, event: string, data: unknown): void {
    const io = ensureInitialized();
    io.of(namespace).to(room).emit(event, data);
  },

  /**
   * Push an event to a specific user across all realtime transports:
   * default Socket.IO namespace, `/notifications` namespace, lightweight `ws` sockets,
   * and Server-Sent Events (SSE) streams.
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    const io = ensureInitialized();
    const room = `${SOCKET_ROOM_PREFIX.notification}${userId}`;

    io.to(room).emit(event, data);
    io.of('/notifications').to(room).emit(event, data);
    wsService.emitToUser(userId, event, data);
    sseService.emitToUser(userId, event, data);
  },

  emitToAll(event: string, data: unknown): void {
    const io = ensureInitialized();
    io.emit(event, data);
  },

  getConnectedCount(): number {
    const io = ensureInitialized();
    return io.engine.clientsCount;
  },

  getSocketById(socketId: string): Socket | undefined {
    const io = ensureInitialized();
    return io.sockets.sockets.get(socketId);
  },

  disconnectSocket(socketId: string, reason?: string): void {
    const socket = this.getSocketById(socketId);
    if (socket) {
      socket.disconnect(true);
      logger.info(`Socket ${socketId} disconnected`, { reason });
    }
  },
};
