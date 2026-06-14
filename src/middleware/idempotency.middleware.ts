import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { redisClient } from '../config/redis';

const CACHE_PREFIX = 'idempotency:cache:';
const LOCK_PREFIX = 'idempotency:lock:';
const POLL_INTERVAL_MS = 100;

const isReadOnly = (method: string): boolean =>
  ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

const cacheKey = (key: string): string => `${CACHE_PREFIX}${key}`;
const lockKey = (key: string): string => `${LOCK_PREFIX}${key}`;

/**
 * Build a deterministic fingerprint for the request so that the same
 * idempotency key cannot be reused with a different payload or URL.
 */
const buildFingerprint = (req: Request): string => {
  const body = JSON.stringify(req.body ?? {});
  return crypto
    .createHash('sha256')
    .update(`${req.method}:${req.originalUrl}:${body}`)
    .digest('hex');
};

interface CachedResponse {
  statusCode: number;
  headers: Record<string, unknown>;
  body: string;
  fingerprint: string;
}

const validateKey = (key: string): boolean => /^[a-zA-Z0-9._:-]{1,255}$/.test(key);

const sendCachedResponse = (res: Response, cached: CachedResponse): void => {
  res.status(cached.statusCode);
  for (const [name, value] of Object.entries(cached.headers)) {
    if (
      value !== undefined &&
      !['content-length', 'transfer-encoding'].includes(name.toLowerCase())
    ) {
      res.setHeader(name, value as string);
    }
  }
  res.send(cached.body);
};

/**
 * Wait for an in-flight idempotent request to complete and return its cached
 * response. Returns `null` when no cached response appears within the lock TTL.
 */
const waitForCachedResponse = async (
  idempotencyKey: string,
  fingerprint: string,
  req: Request
): Promise<CachedResponse | 'mismatch' | null> => {
  const deadline = Date.now() + env.IDEMPOTENCY_LOCK_TTL_SECONDS * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const raw = await redisClient.get(cacheKey(idempotencyKey));
    if (raw) {
      const parsed = JSON.parse(raw) as CachedResponse;
      if (parsed.fingerprint !== fingerprint) {
        return 'mismatch';
      }
      return parsed;
    }

    // If the lock is gone and there is no cache, the first attempt failed.
    // Let the caller retry by returning null.
    const lock = await redisClient.get(lockKey(idempotencyKey));
    if (!lock) {
      return null;
    }
  }

  logger.warn('Idempotency lock wait timed out', { key: idempotencyKey, requestId: req.requestId });
  return null;
};

/**
 * Production-grade idempotency middleware.
 *
 * - Skips read-only methods (GET/HEAD/OPTIONS) and requests without an
 *   idempotency key header.
 * - Caches only successful (2xx) responses in Redis.
 * - Locks concurrent requests with the same key so duplicates wait for the
 *   first request to finish instead of being processed twice.
 * - Returns 409 if the same key is reused with a different request fingerprint.
 * - Releases locks and logs failures gracefully so Redis issues do not break
 *   the application.
 */
export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!env.IDEMPOTENCY_ENABLED || isReadOnly(req.method)) {
    return next();
  }

  const idempotencyKey = req.get(env.IDEMPOTENCY_KEY_HEADER)?.trim();
  if (!idempotencyKey) {
    return next();
  }

  if (!validateKey(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid idempotency key',
      requestId: req.requestId,
    });
  }

  const fingerprint = buildFingerprint(req);
  const cKey = cacheKey(idempotencyKey);
  const lKey = lockKey(idempotencyKey);

  try {
    const cachedRaw = await redisClient.get(cKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as CachedResponse;
      if (cached.fingerprint !== fingerprint) {
        return res.status(409).json({
          success: false,
          message: 'Idempotency key reused with a different request',
          requestId: req.requestId,
        });
      }
      return sendCachedResponse(res, cached);
    }

    const lock = await redisClient.set(lKey, fingerprint, {
      NX: true,
      EX: env.IDEMPOTENCY_LOCK_TTL_SECONDS,
    });

    if (!lock) {
      const result = await waitForCachedResponse(idempotencyKey, fingerprint, req);

      if (result === 'mismatch') {
        return res.status(409).json({
          success: false,
          message: 'Idempotency key reused with a different request',
          requestId: req.requestId,
        });
      }

      if (result) {
        return sendCachedResponse(res, result);
      }

      // First attempt failed; fall through and retry this request.
    }

    // Capture the response body so it can be cached on success.
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let responseBody: unknown;

    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };

    res.send = (body: unknown) => {
      responseBody = body;
      return originalSend(body);
    };

    const releaseLock = async (): Promise<void> => {
      try {
        await redisClient.del(lKey);
      } catch (err) {
        logger.error('Failed to release idempotency lock', {
          error: (err as Error).message,
          key: idempotencyKey,
          requestId: req.requestId,
        });
      }
    };

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cacheEntry: CachedResponse = {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          body:
            typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody ?? {}),
          fingerprint,
        };

        redisClient
          .set(cKey, JSON.stringify(cacheEntry), { EX: env.IDEMPOTENCY_TTL_SECONDS })
          .catch((err) => {
            logger.error('Failed to cache idempotency response', {
              error: (err as Error).message,
              key: idempotencyKey,
              requestId: req.requestId,
            });
          });
      }

      releaseLock();
    });

    res.on('error', () => {
      releaseLock();
    });

    next();
  } catch (error) {
    logger.error('Idempotency middleware error', {
      error: (error as Error).message,
      key: idempotencyKey,
      requestId: req.requestId,
    });
    next();
  }
};
