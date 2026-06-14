import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser } from './fixtures';

test.describe('Files', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('returns 404 when streaming a missing file', async ({ request }) => {
    const user = await registerUser(request, `file-missing@example.com`);

    const response = await request.get('/api/v1/files/integration-tests/missing.txt/stream', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('rejects multipart init when local provider is active', async ({ request }) => {
    const user = await registerUser(request, `file-multipart@example.com`);

    const response = await request.post('/api/v1/files/multipart/init', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { fileName: 'large-file.zip' },
    });

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
