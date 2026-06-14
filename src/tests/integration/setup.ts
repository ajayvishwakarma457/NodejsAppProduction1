import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../../config/db';
import { redisClient } from '../../config/redis';
import { redisService } from '../../services/redis.service';
import { cleanupCollections } from './helpers';

/**
 * Global integration test lifecycle.
 *
 * Connects to real MongoDB and Redis instances, cleans collections between
 * tests, and tears down connections when the suite finishes.
 */

beforeAll(async () => {
  await db.connect();
  await redisService.connect();
});

afterEach(async () => {
  await cleanupCollections();
});

afterAll(async () => {
  await cleanupCollections();

  if (redisClient.isOpen) {
    await redisClient.flushDb();
    await redisService.disconnect();
  }

  await db.disconnect();
});
