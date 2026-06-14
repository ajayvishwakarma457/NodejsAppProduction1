import { test, expect } from '@playwright/test';

test.describe('Health', () => {
  test('GET /health returns a healthy status', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('OK');
    expect(body.checks.mongodb).toBe('ok');
    expect(body.checks.redis).toBe('ok');
  });
});
