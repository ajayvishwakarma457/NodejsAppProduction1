import { WebSocket } from 'ws';
import { WSMessage } from '../services/ws.service';

export const sendMessage = (socket: WebSocket, event: string, payload: unknown): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ event, payload } as WSMessage));
  }
};
