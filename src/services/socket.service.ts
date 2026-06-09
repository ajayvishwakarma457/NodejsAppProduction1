import { Server } from "socket.io";

let ioInstance: Server | null = null;

export const socketService = {
  setIO(io: Server) {
    ioInstance = io;
  },
  getIO() {
    return ioInstance;
  }
};

