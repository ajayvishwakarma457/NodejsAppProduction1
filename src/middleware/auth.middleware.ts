import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { tokenService } from '../services/token.service';
import { apiKeyService } from '../modules/api-keys/api-key.service';

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
};

const extractApiKey = (req: Request): string | null => {
  const value = req.headers[env.API_KEY_HEADER_NAME.toLowerCase()];
  if (!value || typeof value !== 'string') return null;
  return value.trim();
};

const authenticateJwt = async (req: Request): Promise<boolean> => {
  const token = extractBearerToken(req);
  if (!token) return false;

  const isBlacklisted = await tokenService.isBlacklisted(token);
  if (isBlacklisted) {
    throw ApiError.unauthorized('Token has been revoked');
  }

  const payload = tokenService.verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
  req.authType = 'jwt';

  return true;
};

const authenticateApiKey = async (req: Request): Promise<boolean> => {
  const apiKey = extractApiKey(req);
  if (!apiKey) return false;

  const result = await apiKeyService.validateApiKey(apiKey);
  if (!result) {
    throw ApiError.unauthorized('Invalid API key');
  }

  req.user = {
    id: result.id,
    email: result.email,
    role: result.role,
  };
  req.authType = 'apiKey';

  return true;
};

/** Require a valid access token or API key. Attaches decoded user to req.user. */
export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const hasBearerToken = extractBearerToken(req) !== null;
    if (hasBearerToken) {
      await authenticateJwt(req);
      next();
      return;
    }

    const hasApiKey = extractApiKey(req) !== null;
    if (hasApiKey) {
      await authenticateApiKey(req);
      next();
      return;
    }

    next(ApiError.unauthorized('Access token or API key required'));
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized('Authentication failed'));
  }
};

/** Optional auth: attaches user if token or API key is present and valid, otherwise continues anonymously. */
export const optionalAuthMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const isJwtAuthenticated = await authenticateJwt(req);
    if (isJwtAuthenticated) {
      next();
      return;
    }

    await authenticateApiKey(req);
    next();
  } catch {
    next();
  }
};
