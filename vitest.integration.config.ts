import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for integration tests.
 *
 * These tests exercise the Express application end-to-end through Supertest
 * and require real MongoDB and Redis instances (see .env.test.example).
 */
export default defineConfig({
  test: {
    globals: false,
    include: ['src/tests/integration/**/*.test.ts'],
    setupFiles: ['src/tests/integration/setup.ts'],
    env: {
      NODE_ENV: 'test',
      APP_NAME: 'NodejsAppProduction1',
      JWT_SECRET: 'integration-test-jwt-secret-32chars!',
      JWT_REFRESH_SECRET: 'integration-test-refresh-secret-32!',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      REDIS_URL: 'redis://localhost:6379',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/nodejs-app-production1-integration-test',
      CLIENT_URL: '*',
      LOG_LEVEL: 'error',
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_PATH: 'uploads',
      STORAGE_MAX_FILE_SIZE_MB: '10',
      STORAGE_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/webp,application/pdf',
      RATE_LIMIT_ENABLED: 'false',
      EVENT_BUS_ENABLED: 'false',
      WS_ENABLED: 'false',
      EMAIL_JOB_ENABLED: 'false',
      NOTIFICATION_JOB_ENABLED: 'false',
      REMINDER_JOB_ENABLED: 'false',
      IMAGE_PROCESSING_ENABLED: 'false',
      API_KEY_HEADER_NAME: 'X-API-Key',
      API_KEY_PREFIX: 'npak_',
      API_KEY_HASH_SALT_ROUNDS: '10',
      API_KEY_MAX_KEYS_PER_USER: '10',
      API_KEY_DEFAULT_EXPIRY_DAYS: '365',
      SEED_ALLOWED_ENVS: 'development,test,staging',
    },
    hookTimeout: 30000,
    testTimeout: 30000,
    // Integration tests share a real database, so run them sequentially to
    // avoid cross-test data races. Per-test cleanup still resets state.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
