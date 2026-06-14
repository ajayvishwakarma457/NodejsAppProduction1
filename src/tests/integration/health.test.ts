import { describe, it, expect } from 'vitest';
import { api } from './helpers';

describe('GET /health', () => {
  it('returns 200 when MongoDB and Redis are healthy', async () => {
    const response = await api.get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.checks).toMatchObject({
      server: 'ok',
      mongodb: 'ok',
      redis: 'ok',
    });
    expect(response.body.timestamp).toBeDefined();
  });
});
