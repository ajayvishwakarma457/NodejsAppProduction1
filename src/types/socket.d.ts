import { Socket } from "socket.io";
import { UserContext } from "./express";

declare module "socket.io" {
  interface Handshake {
    auth: {
      token?: string;
      role?: string;
    };
  }

  interface Socket {
    user?: UserContext;
  }
}

export {};
