import type { Request, Response } from 'express';
import morgan from 'morgan';
import { env } from '../config/env';
import { logger } from '../config/logger';

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
 * Stream that forwards Morgan output to the application Winston logger.
 *
 * Morgan always emits a single line string, so we route it through logger.info.
 * This keeps all application logs on the same transport(s) and with the same
 * formatting policy (JSON / pretty, console / rotating file) configured in
 * config/logger.ts.
 */
const morganStream: morgan.StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Production-grade Morgan HTTP request logging middleware.
 *
 * Features:
 * - Configurable format via MORGAN_FORMAT (default 'combined').
 * - Optional structured JSON format named 'json'.
 * - Custom tokens for requestId and userId correlation.
 * - Output routed through Winston for centralized log handling.
 * - Health check requests can be skipped via MORGAN_SKIP_HEALTH_CHECK.
 * - Immediate logging (before response finishes) via MORGAN_IMMEDIATE.
 */
export const morganMiddleware = morgan(env.MORGAN_FORMAT, {
  stream: morganStream,
  skip: (req: Request) => {
    if (!env.MORGAN_SKIP_HEALTH_CHECK) {
      return false;
    }
    return req.path === '/health';
  },
  immediate: env.MORGAN_IMMEDIATE,
});
