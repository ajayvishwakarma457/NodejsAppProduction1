import { describe, it, expect, beforeEach } from 'vitest';
import { sseService } from '../services/sse.service';

interface MockResponse {
  write: (chunk: string) => boolean;
  flush: () => void;
  chunks: string[];
}

const createMockRes = (): MockResponse => {
  const chunks: string[] = [];
  return {
    write: (chunk: string) => {
      chunks.push(chunk);
      return true;
    },
    flush: () => {
      // no-op
    },
    chunks,
  };
};

const parseEvents = (raw: string): Array<{ event: string; data: unknown; id?: string }> => {
  const events: Array<{ event: string; data: unknown; id?: string }> = [];
  const blocks = raw.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    let event = '';
    let id: string | undefined;
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) event = line.replace('event:', '').trim();
      else if (line.startsWith('id:')) id = line.replace('id:', '').trim();
      else if (line.startsWith('data:')) data = line.replace('data:', '').trim();
    }

    if (event) {
      events.push({ event, data: data ? JSON.parse(data) : undefined, id });
    }
  }

  return events;
};

describe('sseService', () => {
  beforeEach(() => {
    sseService.clear();
  });

  it('should add a client and send a connected event', () => {
    const res = createMockRes();
    sseService.addClient(res as unknown as Parameters<typeof sseService.addClient>[0], 'user-1');

    const events = parseEvents(res.chunks.join(''));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('connected');
    expect(events[0].data).toMatchObject({ userId: 'user-1' });
  });

  it('should emit user-specific events only to matching clients', () => {
    const res1 = createMockRes();
    const res2 = createMockRes();

    sseService.addClient(res1 as unknown as Parameters<typeof sseService.addClient>[0], 'user-a');
    sseService.addClient(res2 as unknown as Parameters<typeof sseService.addClient>[0], 'user-b');

    sseService.emitToUser('user-a', 'notification:new', { title: 'Hello A' });

    const events1 = parseEvents(res1.chunks.slice(1).join(''));
    const events2 = parseEvents(res2.chunks.slice(1).join(''));

    expect(events1).toHaveLength(1);
    expect(events1[0].event).toBe('notification:new');
    expect(events1[0].data).toMatchObject({ title: 'Hello A' });

    expect(events2).toHaveLength(0);
  });

  it('should broadcast events to all connected clients', () => {
    const res1 = createMockRes();
    const res2 = createMockRes();

    sseService.addClient(res1 as unknown as Parameters<typeof sseService.addClient>[0], 'user-a');
    sseService.addClient(res2 as unknown as Parameters<typeof sseService.addClient>[0], 'user-b');

    sseService.broadcast('system:announcement', { message: 'Hello everyone' });

    const events1 = parseEvents(res1.chunks.slice(1).join(''));
    const events2 = parseEvents(res2.chunks.slice(1).join(''));

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0].data).toMatchObject({ message: 'Hello everyone' });
    expect(events2[0].data).toMatchObject({ message: 'Hello everyone' });
  });

  it('should remove clients and stop targeting them', () => {
    const res = createMockRes();
    sseService.addClient(res as unknown as Parameters<typeof sseService.addClient>[0], 'user-c');
    sseService.removeClient(
      res as unknown as Parameters<typeof sseService.removeClient>[0],
      'user-c'
    );

    sseService.emitToUser('user-c', 'notification:new', { title: 'miss' });

    const events = parseEvents(res.chunks.slice(1).join(''));
    expect(events).toHaveLength(0);
    expect(sseService.getClientCount()).toBe(0);
  });
});
