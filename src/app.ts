import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import path from 'path';
import mongoose from 'mongoose';
import { authRouter } from './modules/auth/auth.routes';
import { commentRouter } from './modules/comments/comment.routes';
import { notificationRouter } from './modules/notifications/notification.routes';
import { projectRouter } from './modules/projects/project.routes';
import { taskRouter } from './modules/tasks/task.routes';
import { teamRouter } from './modules/teams/team.routes';
import { userRouter } from './modules/users/user.routes';
import { env } from './config/env';
import { logger } from './config/logger';
import { redisClient } from './config/redis';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { optionalAuthMiddleware } from './middleware/auth.middleware';

/* ------------------------------------------------------------------ */
// App instance
/* ------------------------------------------------------------------ */

export const app = express();

/* ------------------------------------------------------------------ */
// Trust proxy (required for correct req.ip behind load balancers)
/* ------------------------------------------------------------------ */

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

/* ------------------------------------------------------------------ */
// Security hardening
/* ------------------------------------------------------------------ */

app.disable('x-powered-by');
app.use(
  helmet({
    // Minimal CSP for JSON APIs — satisfies security scanners without bloat
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
      },
    },

    // Allow frontend on a different origin to load uploaded files from /uploads
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // This can break API clients and file loading
    crossOriginEmbedderPolicy: false,

    // Enforce HTTPS in production only
    hsts:
      env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL === '*' ? true : env.CLIENT_URL,
    credentials: true,
  })
);

/* ------------------------------------------------------------------ */
// Request identification
/* ------------------------------------------------------------------ */

app.use(requestIdMiddleware);

/* ------------------------------------------------------------------ */
// Request logger
/* ------------------------------------------------------------------ */

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      requestId: req.requestId,
      userId: req.user?.id,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

/* ------------------------------------------------------------------ */
// Body parsers
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ------------------------------------------------------------------ */
// Static files (local uploads)
/* ------------------------------------------------------------------ */

if (env.STORAGE_PROVIDER === 'local') {
  const uploadsPath = path.resolve(env.STORAGE_LOCAL_PATH);
  app.use(
    '/uploads',
    express.static(uploadsPath, {
      index: false,
      immutable: true,
      maxAge: '1y',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );
}

/* ------------------------------------------------------------------ */
// Health check
/* ------------------------------------------------------------------ */

app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {
    server: 'ok',
  };

  // MongoDB connectivity check
  try {
    const mongoState = mongoose.connection.readyState;
    checks.mongodb = mongoState === 1 ? 'ok' : 'error';
  } catch {
    checks.mongodb = 'error';
  }

  // Redis connectivity check
  try {
    const redisPing = await redisClient.ping();
    checks.redis = redisPing === 'PONG' ? 'ok' : 'error';
  } catch {
    checks.redis = 'error';
  }

  const allHealthy = Object.values(checks).every((status) => status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: allHealthy,
    message: allHealthy ? 'OK' : 'Service unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------------ */
// Rate limiting (after optional auth so user-based limits work)
/* ------------------------------------------------------------------ */

app.use(optionalAuthMiddleware);
app.use(rateLimitMiddleware);

/* ------------------------------------------------------------------ */
// API routes
/* ------------------------------------------------------------------ */

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/teams', teamRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/notifications', notificationRouter);

/* ------------------------------------------------------------------ */
// Error handling
/* ------------------------------------------------------------------ */

app.use(notFoundMiddleware);
app.use(errorMiddleware);
