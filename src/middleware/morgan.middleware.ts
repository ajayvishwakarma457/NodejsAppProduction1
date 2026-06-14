import type { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Map an HTTP response status code to the corresponding application log level.
 * Mirrors the level mapping used by the existing Winston request logger.
 */
const statusToLogLevel = (statusCode: number): 'error' | 'warn' | 'info' => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
};

/**
 * Custom Morgan token that exposes the per-request correlation id
 * attached earlier in the request pipeline by requestIdMiddleware.
 */
morgan.token('requestId', (req: Request) => req.requestId ?? '-');

/**
 * Custom Morgan token that exposes the authenticated user id, if any.
 */
morgan.token('userId', (req: Request) => req.user?.id ?? '-');

/**
 * Structured JSON Morgan format.
 *
 * This format is intentionally separate from the built-in 'combined' / 'common'
 * formats so production deployments can emit machine-parseable JSON through the
 * same Winston pipeline used by the rest of the application.
 */
morgan.format('json', (tokens, req: Request, res: Response) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)) || undefined,
    contentLength: tokens.res(req, res, 'content-length'),
    responseTimeMs: Number(tokens['response-time'](req, res)) || undefined,
    requestId: tokens.requestId(req, res),
    userId: tokens.userId(req, res),
    remoteAddr: tokens['remote-addr'](req, res),
    userAgent: tokens['user-agent'](req, res),
    referrer: tokens.referrer(req, res),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Production-grade Morgan HTTP request logging middleware.
 *
 * Features:
 * - Configurable format via MORGAN_FORMAT (default 'combined').
 * - Optional structured JSON format named 'json'.
 * - Custom tokens for requestId and userId correlation.
 * - Output routed through Winston at the appropriate log level:
 *   5xx -> error, 4xx -> warn, otherwise -> info.
 * - Health check requests can be skipped via MORGAN_SKIP_HEALTH_CHECK.
 * - Immediate logging (before response finishes) via MORGAN_IMMEDIATE.
 */
export const morganMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const stream: morgan.StreamOptions = {
    write: (message: string) => {
      // When immediate logging is enabled the response has not finished yet,
      // so the status code is not meaningful. Log those as info.
      const level = env.MORGAN_IMMEDIATE ? 'info' : statusToLogLevel(res.statusCode);
      logger[level](message.trim());
    },
  };

  const skip = (request: Request) => {
    if (!env.MORGAN_SKIP_HEALTH_CHECK) {
      return false;
    }
    return request.path === '/health';
  };

  return morgan(env.MORGAN_FORMAT, {
    stream,
    skip,
    immediate: env.MORGAN_IMMEDIATE,
  })(req, res, next);
};
