import "express";

export interface UserContext {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      requestId?: string;
    }
  }
}

export {};
