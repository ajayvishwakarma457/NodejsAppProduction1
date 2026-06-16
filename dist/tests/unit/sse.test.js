"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sse_service_1 = require("../../modules/sse/sse.service");
const createMockRes = () => {
    const chunks = [];
    return {
        write: (chunk) => {
            chunks.push(chunk);
            return true;
        },
        flush: () => {
            // no-op
        },
        chunks,
    };
};
const parseEvents = (raw) => {
    const events = [];
    const blocks = raw.split('\n\n').filter(Boolean);
    for (const block of blocks) {
        const lines = block.split('\n');
        let event = '';
        let id;
        let data = '';
        for (const line of lines) {
            if (line.startsWith('event:'))
                event = line.replace('event:', '').trim();
            else if (line.startsWith('id:'))
                id = line.replace('id:', '').trim();
            else if (line.startsWith('data:'))
                data = line.replace('data:', '').trim();
        }
        if (event) {
            events.push({ event, data: data ? JSON.parse(data) : undefined, id });
        }
    }
    return events;
};
(0, vitest_1.describe)('sseService', () => {
    (0, vitest_1.beforeEach)(() => {
        sse_service_1.sseService.clear();
    });
    (0, vitest_1.it)('should add a client and send a connected event', () => {
        const res = createMockRes();
        sse_service_1.sseService.addClient(res, 'user-1');
        const events = parseEvents(res.chunks.join(''));
        (0, vitest_1.expect)(events).toHaveLength(1);
        (0, vitest_1.expect)(events[0].event).toBe('connected');
        (0, vitest_1.expect)(events[0].data).toMatchObject({ userId: 'user-1' });
    });
    (0, vitest_1.it)('should emit user-specific events only to matching clients', () => {
        const res1 = createMockRes();
        const res2 = createMockRes();
        sse_service_1.sseService.addClient(res1, 'user-a');
        sse_service_1.sseService.addClient(res2, 'user-b');
        sse_service_1.sseService.emitToUser('user-a', 'notification:new', { title: 'Hello A' });
        const events1 = parseEvents(res1.chunks.slice(1).join(''));
        const events2 = parseEvents(res2.chunks.slice(1).join(''));
        (0, vitest_1.expect)(events1).toHaveLength(1);
        (0, vitest_1.expect)(events1[0].event).toBe('notification:new');
        (0, vitest_1.expect)(events1[0].data).toMatchObject({ title: 'Hello A' });
        (0, vitest_1.expect)(events2).toHaveLength(0);
    });
    (0, vitest_1.it)('should broadcast events to all connected clients', () => {
        const res1 = createMockRes();
        const res2 = createMockRes();
        sse_service_1.sseService.addClient(res1, 'user-a');
        sse_service_1.sseService.addClient(res2, 'user-b');
        sse_service_1.sseService.broadcast('system:announcement', { message: 'Hello everyone' });
        const events1 = parseEvents(res1.chunks.slice(1).join(''));
        const events2 = parseEvents(res2.chunks.slice(1).join(''));
        (0, vitest_1.expect)(events1).toHaveLength(1);
        (0, vitest_1.expect)(events2).toHaveLength(1);
        (0, vitest_1.expect)(events1[0].data).toMatchObject({ message: 'Hello everyone' });
        (0, vitest_1.expect)(events2[0].data).toMatchObject({ message: 'Hello everyone' });
    });
    (0, vitest_1.it)('should remove clients and stop targeting them', () => {
        const res = createMockRes();
        sse_service_1.sseService.addClient(res, 'user-c');
        sse_service_1.sseService.removeClient(res, 'user-c');
        sse_service_1.sseService.emitToUser('user-c', 'notification:new', { title: 'miss' });
        const events = parseEvents(res.chunks.slice(1).join(''));
        (0, vitest_1.expect)(events).toHaveLength(0);
        (0, vitest_1.expect)(sse_service_1.sseService.getClientCount()).toBe(0);
    });
});
//# sourceMappingURL=sse.test.js.map