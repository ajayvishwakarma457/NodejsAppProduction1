declare module 'socket.io' {
  interface Handshake {
    auth: {
      token?: string;
      role?: string;
    };
  }

  interface Socket {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

export {};
