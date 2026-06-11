import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface RateLimitIdentifier {
  type: 'user' | 'ip';
  id: string;
}

const getIdentifier = (req: Request): RateLimitIdentifier => {
  if (req.user?.id) {
    return { type: 'user', id: req.user.id };
  }
  return { type: 'ip', id: req.ip || 'unknown' };
};

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!env.RATE_LIMIT_ENABLED || req.path === '/health') {
    return next();
  }

  const prefix = `${env.APP_NAME}:ratelimit`;
  const windowSeconds = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);

  const { type, id } = getIdentifier(req);
  const key = `${prefix}:${type}:${id}`;
  const maxRequests =
    type === 'user' ? env.RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS : env.RATE_LIMIT_MAX_REQUESTS;

  try {
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    let ttl = windowSeconds;
    try {
      const redisTtl = await redisClient.ttl(key);
      if (redisTtl > 0) ttl = redisTtl;
    } catch {
      /* ignore TTL read failures */
    }
    const resetTime = Math.ceil(Date.now() / 1000) + ttl;

    // Legacy headers (backward compatible)
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current)));
    res.setHeader('X-RateLimit-Reset', String(resetTime));

    // Draft-7 standard headers
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - current)));
    res.setHeader('RateLimit-Reset', String(resetTime));

    if (current > maxRequests) {
      const retryAfter = Math.max(0, ttl);

      logger.warn('Rate limit exceeded', {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
        identifier: id,
        type,
        count: current,
      });

      res.setHeader('Retry-After', String(retryAfter));

      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests, please try again later',
        requestId: req.requestId,
      });
    }

    next();
  } catch (error) {
    logger.warn('Rate limiting check failed, allowing request', {
      error: error instanceof Error ? error.message : error,
      requestId: req.requestId,
    });
    next();
  }
};
