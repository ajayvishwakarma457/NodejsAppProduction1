import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { wsService } from '../../services/ws.service';
import { tokenService } from '../../services/token.service';

interface WSIncomingMessage {
  event: string;
  payload?: unknown;
}

const waitForMessage = (client: WebSocket, event?: string): Promise<WSIncomingMessage> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for WS message')), 2000);

    const handler = (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString()) as WSIncomingMessage;
        if (!event || data.event === event) {
          clearTimeout(timer);
          client.off('message', handler);
          resolve(data);
        }
      } catch {
        // ignore non-JSON
      }
    };

    client.on('message', handler);
  });
};

const waitForOpen = (client: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.once('open', () => resolve());
    client.once('error', (err) => reject(err));
  });
};

const waitForClose = (client: WebSocket): Promise<{ code: number; reason: Buffer }> => {
  return new Promise((resolve) => {
    client.once('close', (code, reason) => resolve({ code, reason }));
  });
};

describe('wsService', () => {
  let port: number;

  beforeAll(async () => {
    const wss = wsService.start({ port: 0 });
    const address = wss.address();
    port = address && typeof address === 'object' ? address.port : 0;
  });

  afterAll(async () => {
    await wsService.stop();
  });

  it('should reject connections without a token', async () => {
    const client = new WebSocket(`ws://localhost:${port}`);
    const { code } = await waitForClose(client);
    expect(code).toBe(1008);
  });

  it('should accept connections with a valid token', async () => {
    const token = tokenService.generateAccessToken('user-ws-1', 'test@example.com', 'member');
    const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

    const msgPromise = waitForMessage(client, 'connection:established');
    await waitForOpen(client);
    const msg = await msgPromise;

    expect(msg.payload).toMatchObject({ userId: 'user-ws-1' });

    client.close();
  });

  it('should deliver user-specific messages via emitToUser', async () => {
    const token = tokenService.generateAccessToken('user-ws-2', 'test@example.com', 'member');
    const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

    const establishedPromise = waitForMessage(client, 'connection:established');
    await waitForOpen(client);
    await establishedPromise;

    const msgPromise = waitForMessage(client, 'notification:new');
    wsService.emitToUser('user-ws-2', 'notification:new', { title: 'Hello ws' });

    const msg = await msgPromise;
    expect(msg.payload).toMatchObject({ title: 'Hello ws' });

    client.close();
  });

  it('should support channel subscriptions via subscribe:<channel>', async () => {
    const token = tokenService.generateAccessToken('user-ws-3', 'test@example.com', 'member');
    const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

    const establishedPromise = waitForMessage(client, 'connection:established');
    await waitForOpen(client);
    await establishedPromise;

    const subscribedPromise = waitForMessage(client, 'subscribed');
    client.send(JSON.stringify({ event: 'subscribe:task:123' }));
    const subscribed = await subscribedPromise;
    expect(subscribed.payload).toMatchObject({ channel: 'task:123' });

    const updatePromise = waitForMessage(client, 'task:updated');
    wsService.emitToChannel('task:123', 'task:updated', { taskId: '123' });
    const update = await updatePromise;
    expect(update.payload).toMatchObject({ taskId: '123' });

    client.close();
  });

  it('should not deliver channel messages to unsubscribed clients', async () => {
    const token = tokenService.generateAccessToken('user-ws-4', 'test@example.com', 'member');
    const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

    const establishedPromise = waitForMessage(client, 'connection:established');
    await waitForOpen(client);
    await establishedPromise;

    wsService.emitToChannel('task:999', 'task:updated', { taskId: '999' });

    await expect(
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve('no-message'), 500);
        client.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString()) as WSIncomingMessage;
            if (data.event === 'task:updated') {
              clearTimeout(timer);
              reject(new Error('Unexpected channel message received'));
            }
          } catch {
            // ignore
          }
        });
      })
    ).resolves.toBe('no-message');

    client.close();
  });
});
