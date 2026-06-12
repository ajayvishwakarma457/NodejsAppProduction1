"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const sockets_1 = require("../../sockets");
const namespaces_1 = require("../../sockets/namespaces");
const socket_service_1 = require("../../services/socket.service");
const token_service_1 = require("../../services/token.service");
const waitForConnect = (client) => {
    return new Promise((resolve, reject) => {
        client.once('connect', () => resolve());
        client.once('connect_error', (err) => reject(err));
    });
};
const waitForEvent = (client, event) => {
    return new Promise((resolve) => {
        client.once(event, (payload) => resolve(payload));
    });
};
(0, vitest_1.describe)('Socket.IO namespaces', () => {
    let httpServer;
    let io;
    let port;
    const clientSockets = [];
    const createClient = (namespace = '', token) => {
        const client = (0, socket_io_client_1.io)(`http://localhost:${port}${namespace}`, {
            auth: token ? { token } : {},
            transports: ['websocket'],
        });
        clientSockets.push(client);
        return client;
    };
    (0, vitest_1.beforeAll)(async () => {
        httpServer = http_1.default.createServer();
        io = new socket_io_1.Server(httpServer, { transports: ['websocket'] });
        socket_service_1.socketService.setIO(io);
        (0, sockets_1.registerSockets)(io);
        (0, namespaces_1.initializeNamespaces)(io);
        await new Promise((resolve) => httpServer.listen(0, resolve));
        port = httpServer.address().port;
    });
    (0, vitest_1.afterAll)(async () => {
        for (const client of clientSockets) {
            client.close();
        }
        io.close();
        httpServer.close();
    });
    (0, vitest_1.it)('should reject namespace connections without a token', async () => {
        const client = createClient('/notifications');
        const error = await waitForEvent(client, 'connection:error');
        (0, vitest_1.expect)(error).toMatchObject({ message: 'Authentication required' });
    });
    (0, vitest_1.it)('should connect to /notifications namespace with a valid token', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ns-1', 'test@example.com', 'member');
        const client = createClient('/notifications', token);
        await (0, vitest_1.expect)(waitForConnect(client)).resolves.toBeUndefined();
    });
    (0, vitest_1.it)('should deliver user-specific broadcasts on /notifications namespace', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ns-2', 'test@example.com', 'member');
        const client = createClient('/notifications', token);
        await waitForConnect(client);
        socket_service_1.socketService.emitToUser('user-ns-2', 'notification:new', { title: 'Hello namespace' });
        const msg = await waitForEvent(client, 'notification:new');
        (0, vitest_1.expect)(msg.title).toBe('Hello namespace');
    });
    (0, vitest_1.it)('should deliver user-specific broadcasts on the default namespace', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ns-3', 'test@example.com', 'member');
        const client = createClient('', token);
        await waitForConnect(client);
        socket_service_1.socketService.emitToUser('user-ns-3', 'notification:new', { title: 'Hello default' });
        const msg = await waitForEvent(client, 'notification:new');
        (0, vitest_1.expect)(msg.title).toBe('Hello default');
    });
    (0, vitest_1.it)('should connect to /tasks and /teams namespaces with a valid token', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ns-4', 'test@example.com', 'member');
        const tasksClient = createClient('/tasks', token);
        tasksClient.on('connect_error', (err) => {
            console.log('tasks connect_error', err.message);
        });
        await (0, vitest_1.expect)(waitForConnect(tasksClient)).resolves.toBeUndefined();
        const teamsClient = createClient('/teams', token);
        await (0, vitest_1.expect)(waitForConnect(teamsClient)).resolves.toBeUndefined();
    }, 10000);
});
//# sourceMappingURL=namespaces.test.js.map