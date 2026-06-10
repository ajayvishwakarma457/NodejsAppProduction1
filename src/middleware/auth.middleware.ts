import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { tokenService } from "../services/token.service";

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
};

/** Require a valid access token. Attaches decoded user to req.user. */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      next(ApiError.unauthorized("Access token required"));
      return;
    }

    const isBlacklisted = await tokenService.isBlacklisted(token);
    if (isBlacklisted) {
      next(ApiError.unauthorized("Token has been revoked"));
      return;
    }

    const payload = tokenService.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized("Authentication failed"));
  }
};

/** Optional auth: attaches user if token is present and valid, otherwise continues anonymously. */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const isBlacklisted = await tokenService.isBlacklisted(token);
    if (isBlacklisted) {
      next();
      return;
    }

    const payload = tokenService.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch {
    next();
  }
};
