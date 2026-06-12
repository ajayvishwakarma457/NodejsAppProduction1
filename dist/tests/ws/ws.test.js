"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ws_1 = __importDefault(require("ws"));
const ws_service_1 = require("../../services/ws.service");
const token_service_1 = require("../../services/token.service");
const waitForMessage = (client, event) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for WS message')), 2000);
        const handler = (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                if (!event || data.event === event) {
                    clearTimeout(timer);
                    client.off('message', handler);
                    resolve(data);
                }
            }
            catch {
                // ignore non-JSON
            }
        };
        client.on('message', handler);
    });
};
const waitForOpen = (client) => {
    return new Promise((resolve, reject) => {
        client.once('open', () => resolve());
        client.once('error', (err) => reject(err));
    });
};
const waitForClose = (client) => {
    return new Promise((resolve) => {
        client.once('close', (code, reason) => resolve({ code, reason }));
    });
};
(0, vitest_1.describe)('wsService', () => {
    let port;
    (0, vitest_1.beforeAll)(async () => {
        const wss = ws_service_1.wsService.start({ port: 0 });
        const address = wss.address();
        port = address && typeof address === 'object' ? address.port : 0;
    });
    (0, vitest_1.afterAll)(async () => {
        await ws_service_1.wsService.stop();
    });
    (0, vitest_1.it)('should reject connections without a token', async () => {
        const client = new ws_1.default(`ws://localhost:${port}`);
        const { code } = await waitForClose(client);
        (0, vitest_1.expect)(code).toBe(1008);
    });
    (0, vitest_1.it)('should accept connections with a valid token', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ws-1', 'test@example.com', 'member');
        const client = new ws_1.default(`ws://localhost:${port}?token=${token}`);
        const msgPromise = waitForMessage(client, 'connection:established');
        await waitForOpen(client);
        const msg = await msgPromise;
        (0, vitest_1.expect)(msg.payload).toMatchObject({ userId: 'user-ws-1' });
        client.close();
    });
    (0, vitest_1.it)('should deliver user-specific messages via emitToUser', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ws-2', 'test@example.com', 'member');
        const client = new ws_1.default(`ws://localhost:${port}?token=${token}`);
        const establishedPromise = waitForMessage(client, 'connection:established');
        await waitForOpen(client);
        await establishedPromise;
        const msgPromise = waitForMessage(client, 'notification:new');
        ws_service_1.wsService.emitToUser('user-ws-2', 'notification:new', { title: 'Hello ws' });
        const msg = await msgPromise;
        (0, vitest_1.expect)(msg.payload).toMatchObject({ title: 'Hello ws' });
        client.close();
    });
    (0, vitest_1.it)('should support channel subscriptions via subscribe:<channel>', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ws-3', 'test@example.com', 'member');
        const client = new ws_1.default(`ws://localhost:${port}?token=${token}`);
        const establishedPromise = waitForMessage(client, 'connection:established');
        await waitForOpen(client);
        await establishedPromise;
        const subscribedPromise = waitForMessage(client, 'subscribed');
        client.send(JSON.stringify({ event: 'subscribe:task:123' }));
        const subscribed = await subscribedPromise;
        (0, vitest_1.expect)(subscribed.payload).toMatchObject({ channel: 'task:123' });
        const updatePromise = waitForMessage(client, 'task:updated');
        ws_service_1.wsService.emitToChannel('task:123', 'task:updated', { taskId: '123' });
        const update = await updatePromise;
        (0, vitest_1.expect)(update.payload).toMatchObject({ taskId: '123' });
        client.close();
    });
    (0, vitest_1.it)('should not deliver channel messages to unsubscribed clients', async () => {
        const token = token_service_1.tokenService.generateAccessToken('user-ws-4', 'test@example.com', 'member');
        const client = new ws_1.default(`ws://localhost:${port}?token=${token}`);
        const establishedPromise = waitForMessage(client, 'connection:established');
        await waitForOpen(client);
        await establishedPromise;
        ws_service_1.wsService.emitToChannel('task:999', 'task:updated', { taskId: '999' });
        await (0, vitest_1.expect)(new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve('no-message'), 500);
            client.on('message', (raw) => {
                try {
                    const data = JSON.parse(raw.toString());
                    if (data.event === 'task:updated') {
                        clearTimeout(timer);
                        reject(new Error('Unexpected channel message received'));
                    }
                }
                catch {
                    // ignore
                }
            });
        })).resolves.toBe('no-message');
        client.close();
    });
});
//# sourceMappingURL=ws.test.js.map