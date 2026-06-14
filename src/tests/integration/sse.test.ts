import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import http from 'http';
import type { AddressInfo } from 'net';
import { app } from '../../app';
import { register } from './helpers';

const closeServer = (server: http.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

describe('GET /api/v1/events/stream', () => {
  it('opens an SSE stream and receives the connected event', async () => {
    const { session } = await register({ email: 'sse-connect@example.com' });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.get(
          `http://127.0.0.1:${port}/api/v1/events/stream`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
          (res) => {
            res.setEncoding('utf8');
            res.on('data', () => {
              resolve(res);
              req.destroy();
            });
            res.on('error', () => {});
          }
        );

        req.on('error', (err) => {
          if (
            err.message?.includes('aborted') ||
            err.message?.includes('socket hang up') ||
            (err as { code?: string }).code === 'ECONNRESET'
          ) {
            return;
          }
          reject(err);
        });

        req.on('socket', (socket) => {
          socket.on('error', () => {});
        });
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.headers['content-type']).toBe('text/event-stream');
    } finally {
      await closeServer(server);
    }
  });

  it('rejects unauthenticated connections', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/v1/events/stream`, (res) => {
          resolve(res);
          req.destroy();
        });

        req.on('error', reject);
      });

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    } finally {
      await closeServer(server);
    }
  });
});
