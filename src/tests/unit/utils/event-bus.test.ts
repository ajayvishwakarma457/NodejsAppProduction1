import { describe, it, expect, beforeEach } from 'vitest';
import { eventBus } from '../../../utils/event-bus';

describe('eventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should deliver events to registered listeners', async () => {
    const received: string[] = [];

    eventBus.on('user.created', ({ userId }) => {
      received.push(userId);
    });

    eventBus.emit('user.created', {
      userId: 'user-1',
      email: 'a@example.com',
      firstName: 'A',
      lastName: 'B',
      role: 'member',
    });

    await eventBus.emitAndWait('user.created', {
      userId: 'user-2',
      email: 'b@example.com',
      firstName: 'C',
      lastName: 'D',
      role: 'member',
    });

    expect(received).toContain('user-1');
    expect(received).toContain('user-2');
  });

  it('should support async listeners', async () => {
    let value = 0;

    eventBus.on('task.created', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      value = 42;
    });

    await eventBus.emitAndWait('task.created', { taskId: 't1', createdBy: 'u1' });
    expect(value).toBe(42);
  });

  it('should isolate listener errors so other listeners still run', async () => {
    const received: string[] = [];

    eventBus.on('project.created', () => {
      throw new Error('boom');
    });

    eventBus.on('project.created', ({ projectId }) => {
      received.push(projectId);
    });

    await eventBus.emitAndWait('project.created', {
      projectId: 'p1',
      ownerId: 'u1',
      name: 'Project',
    });

    expect(received).toEqual(['p1']);

    const metrics = eventBus.getMetrics();
    expect(metrics['project.created'].emitted).toBe(1);
    expect(metrics['project.created'].handled).toBe(1);
    expect(metrics['project.created'].failed).toBe(1);
  });

  it('should support once listeners', async () => {
    let count = 0;

    eventBus.once('user.updated', () => {
      count++;
    });

    await eventBus.emitAndWait('user.updated', { userId: 'u1', changes: ['name'] });
    await eventBus.emitAndWait('user.updated', { userId: 'u1', changes: ['email'] });

    expect(count).toBe(1);
  });

  it('should support unsubscribing listeners', async () => {
    let count = 0;

    const unsubscribe = eventBus.on('user.deleted', () => {
      count++;
    });

    await eventBus.emitAndWait('user.deleted', { userId: 'u1' });
    unsubscribe();
    await eventBus.emitAndWait('user.deleted', { userId: 'u2' });

    expect(count).toBe(1);
  });

  it('should do nothing when emitting an event with no listeners', async () => {
    await expect(
      eventBus.emitAndWait('notification.created', {
        notificationId: 'n1',
        userId: 'u1',
        type: 'alert',
      })
    ).resolves.toBeUndefined();
  });
});
