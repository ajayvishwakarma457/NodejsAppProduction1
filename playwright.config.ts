import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * These tests exercise the running application through real HTTP calls using
 * Playwright's request context. They are intentionally separate from the
 * Vitest + Supertest integration suite so they can be pointed at deployed
 * environments (staging/production) via the BASE_URL environment variable.
 *
 * Local runs start the server automatically via the `webServer` block below.
 */
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:7777';
const isLocal = !process.env.BASE_URL;

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './e2e-report', open: 'never' }],
    ['junit', { outputFile: './e2e-report/results.xml' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isLocal
    ? {
        command: 'npm run build && node dist/server.js',
        url: `${baseURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
          NODE_ENV: 'test',
          PORT: '7777',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/nodejs-app-production1-e2e-test',
          REDIS_URL: 'redis://localhost:6379',
          RATE_LIMIT_ENABLED: 'false',
          EVENT_BUS_ENABLED: 'false',
          WS_ENABLED: 'false',
          EMAIL_JOB_ENABLED: 'false',
          NOTIFICATION_JOB_ENABLED: 'false',
          REMINDER_JOB_ENABLED: 'false',
        },
      }
    : undefined,
});
