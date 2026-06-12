import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { registerSockets } from '../../sockets';
import { initializeNamespaces } from '../../sockets/namespaces';
import { socketService } from '../../services/socket.service';
import { tokenService } from '../../services/token.service';

const waitForConnect = (client: ClientSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('connect_error', (err) => reject(err));
  });
};

const waitForEvent = <T = unknown>(client: ClientSocket, event: string): Promise<T> => {
  return new Promise((resolve) => {
    client.once(event, (payload: T) => resolve(payload));
  });
};

describe('Socket.IO namespaces', () => {
  let httpServer: http.Server;
  let io: SocketIOServer;
  let port: number;
  const clientSockets: ClientSocket[] = [];

  const createClient = (namespace = '', token?: string): ClientSocket => {
    const client = ioClient(`http://localhost:${port}${namespace}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
    });
    clientSockets.push(client);
    return client;
  };

  beforeAll(async () => {
    httpServer = http.createServer();
    io = new SocketIOServer(httpServer, { transports: ['websocket'] });

    socketService.setIO(io);
    registerSockets(io);
    initializeNamespaces(io);

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as { port: number }).port;
  });

  afterAll(async () => {
    for (const client of clientSockets) {
      client.close();
    }
    io.close();
    httpServer.close();
  });

  it('should reject namespace connections without a token', async () => {
    const client = createClient('/notifications');
    const error = await waitForEvent(client, 'connection:error');
    expect(error).toMatchObject({ message: 'Authentication required' });
  });

  it('should connect to /notifications namespace with a valid token', async () => {
    const token = tokenService.generateAccessToken('user-ns-1', 'test@example.com', 'member');
    const client = createClient('/notifications', token);
    await expect(waitForConnect(client)).resolves.toBeUndefined();
  });

  it('should deliver user-specific broadcasts on /notifications namespace', async () => {
    const token = tokenService.generateAccessToken('user-ns-2', 'test@example.com', 'member');
    const client = createClient('/notifications', token);
    await waitForConnect(client);

    socketService.emitToUser('user-ns-2', 'notification:new', { title: 'Hello namespace' });

    const msg = await waitForEvent<Record<string, string>>(client, 'notification:new');
    expect(msg.title).toBe('Hello namespace');
  });

  it('should deliver user-specific broadcasts on the default namespace', async () => {
    const token = tokenService.generateAccessToken('user-ns-3', 'test@example.com', 'member');
    const client = createClient('', token);
    await waitForConnect(client);

    socketService.emitToUser('user-ns-3', 'notification:new', { title: 'Hello default' });

    const msg = await waitForEvent<Record<string, string>>(client, 'notification:new');
    expect(msg.title).toBe('Hello default');
  });

  it('should connect to /tasks and /teams namespaces with a valid token', async () => {
    const token = tokenService.generateAccessToken('user-ns-4', 'test@example.com', 'member');

    const tasksClient = createClient('/tasks', token);
    tasksClient.on('connect_error', (err) => {
      console.log('tasks connect_error', err.message);
    });

    await expect(waitForConnect(tasksClient)).resolves.toBeUndefined();

    const teamsClient = createClient('/teams', token);
    await expect(waitForConnect(teamsClient)).resolves.toBeUndefined();
  }, 10000);
});
