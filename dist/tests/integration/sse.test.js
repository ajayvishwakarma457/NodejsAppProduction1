"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const http_1 = __importDefault(require("http"));
const app_1 = require("../../app");
const helpers_1 = require("./helpers");
const closeServer = (server) => new Promise((resolve, reject) => {
    server.close((err) => {
        if (err)
            reject(err);
        else
            resolve();
    });
});
(0, vitest_1.describe)('GET /api/v1/events/stream', () => {
    (0, vitest_1.it)('opens an SSE stream and receives the connected event', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'sse-connect@example.com' });
        const server = http_1.default.createServer(app_1.app);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        try {
            const response = await new Promise((resolve, reject) => {
                const req = http_1.default.get(`http://127.0.0.1:${port}/api/v1/events/stream`, { headers: { Authorization: `Bearer ${session.accessToken}` } }, (res) => {
                    res.setEncoding('utf8');
                    res.on('data', () => {
                        resolve(res);
                        req.destroy();
                    });
                    res.on('error', () => { });
                });
                req.on('error', (err) => {
                    if (err.message?.includes('aborted') ||
                        err.message?.includes('socket hang up') ||
                        err.code === 'ECONNRESET') {
                        return;
                    }
                    reject(err);
                });
                req.on('socket', (socket) => {
                    socket.on('error', () => { });
                });
            });
            (0, vitest_1.expect)(response.statusCode).toBe(http_status_codes_1.StatusCodes.OK);
            (0, vitest_1.expect)(response.headers['content-type']).toBe('text/event-stream');
        }
        finally {
            await closeServer(server);
        }
    });
    (0, vitest_1.it)('rejects unauthenticated connections', async () => {
        const server = http_1.default.createServer(app_1.app);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();
        try {
            const response = await new Promise((resolve, reject) => {
                const req = http_1.default.get(`http://127.0.0.1:${port}/api/v1/events/stream`, (res) => {
                    resolve(res);
                    req.destroy();
                });
                req.on('error', reject);
            });
            (0, vitest_1.expect)(response.statusCode).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        }
        finally {
            await closeServer(server);
        }
    });
});
//# sourceMappingURL=sse.test.js.map