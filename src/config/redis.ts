import { createClient } from 'redis';
import { logger } from './logger';
import { env } from './env';

const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
    keepAlive: 5000,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      logger.warn('Redis reconnecting...', { retries, delay });
      return delay;
    },
  },
  pingInterval: 30000,
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis client connecting', { url: sanitizeUrl(env.REDIS_URL) });
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

redisClient.on('end', () => {
  logger.info('Redis client connection closed');
});
