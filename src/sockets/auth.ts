import { Socket } from 'socket.io';
import { tokenService } from '../services/token.service';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
}

export const parseSocketUser = (socket: Socket): SocketUser | null => {
  try {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return null;
    const payload = tokenService.verifyAccessToken(token);
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
};
