import { defineConfig } from 'vitest/config';

/**
 * Default Vitest configuration.
 *
 * Runs the unit test suite under `src/tests/unit/` without requiring
 * running MongoDB/Redis services. Integration tests are executed via
 * `npm run test:integration`.
 */
export default defineConfig({
  test: {
    globals: false,
    include: ['src/tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/src/tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage/unit',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/tests/**',
        'src/config/env.ts',
        'src/scripts/**',
        'src/server.ts',
        'src/app.ts',
      ],
      // Thresholds are set at the current baseline. Raise them as the suite
      // improves; the goal is 80%+ across all metrics for production code.
      thresholds: {
        lines: 45,
        functions: 60,
        branches: 75,
        statements: 45,
      },
    },
  },
});
