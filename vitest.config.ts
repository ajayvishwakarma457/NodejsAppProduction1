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
  },
});
