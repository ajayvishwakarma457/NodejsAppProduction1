import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role?: string;
    }

    interface Request {
      user?: User;
      requestId?: string;
      authType?: 'jwt' | 'apiKey';
    }
  }
}

export {};
