"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const event_bus_1 = require("../../utils/event-bus");
(0, vitest_1.describe)('eventBus', () => {
    (0, vitest_1.beforeEach)(() => {
        event_bus_1.eventBus.clear();
    });
    (0, vitest_1.it)('should deliver events to registered listeners', async () => {
        const received = [];
        event_bus_1.eventBus.on('user.created', ({ userId }) => {
            received.push(userId);
        });
        event_bus_1.eventBus.emit('user.created', {
            userId: 'user-1',
            email: 'a@example.com',
            firstName: 'A',
            lastName: 'B',
            role: 'member',
        });
        await event_bus_1.eventBus.emitAndWait('user.created', {
            userId: 'user-2',
            email: 'b@example.com',
            firstName: 'C',
            lastName: 'D',
            role: 'member',
        });
        (0, vitest_1.expect)(received).toContain('user-1');
        (0, vitest_1.expect)(received).toContain('user-2');
    });
    (0, vitest_1.it)('should support async listeners', async () => {
        let value = 0;
        event_bus_1.eventBus.on('task.created', async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            value = 42;
        });
        await event_bus_1.eventBus.emitAndWait('task.created', { taskId: 't1', createdBy: 'u1' });
        (0, vitest_1.expect)(value).toBe(42);
    });
    (0, vitest_1.it)('should isolate listener errors so other listeners still run', async () => {
        const received = [];
        event_bus_1.eventBus.on('project.created', () => {
            throw new Error('boom');
        });
        event_bus_1.eventBus.on('project.created', ({ projectId }) => {
            received.push(projectId);
        });
        await event_bus_1.eventBus.emitAndWait('project.created', {
            projectId: 'p1',
            ownerId: 'u1',
            name: 'Project',
        });
        (0, vitest_1.expect)(received).toEqual(['p1']);
        const metrics = event_bus_1.eventBus.getMetrics();
        (0, vitest_1.expect)(metrics['project.created'].emitted).toBe(1);
        (0, vitest_1.expect)(metrics['project.created'].handled).toBe(1);
        (0, vitest_1.expect)(metrics['project.created'].failed).toBe(1);
    });
    (0, vitest_1.it)('should support once listeners', async () => {
        let count = 0;
        event_bus_1.eventBus.once('user.updated', () => {
            count++;
        });
        await event_bus_1.eventBus.emitAndWait('user.updated', { userId: 'u1', changes: ['name'] });
        await event_bus_1.eventBus.emitAndWait('user.updated', { userId: 'u1', changes: ['email'] });
        (0, vitest_1.expect)(count).toBe(1);
    });
    (0, vitest_1.it)('should support unsubscribing listeners', async () => {
        let count = 0;
        const unsubscribe = event_bus_1.eventBus.on('user.deleted', () => {
            count++;
        });
        await event_bus_1.eventBus.emitAndWait('user.deleted', { userId: 'u1' });
        unsubscribe();
        await event_bus_1.eventBus.emitAndWait('user.deleted', { userId: 'u2' });
        (0, vitest_1.expect)(count).toBe(1);
    });
    (0, vitest_1.it)('should do nothing when emitting an event with no listeners', async () => {
        await (0, vitest_1.expect)(event_bus_1.eventBus.emitAndWait('notification.created', {
            notificationId: 'n1',
            userId: 'u1',
            type: 'alert',
        })).resolves.toBeUndefined();
    });
});
//# sourceMappingURL=event-bus.test.js.map