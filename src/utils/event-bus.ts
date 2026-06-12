import { EventEmitter } from 'events';
import { logger } from '../config/logger';

/**
 * Application event map.
 *
 * Add new events here so `eventBus.emit` and `eventBus.on` are fully typed.
 */
export interface EventMap {
  'user.created': {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  'user.updated': {
    userId: string;
    changes: string[];
  };
  'user.deleted': {
    userId: string;
  };
  'task.created': {
    taskId: string;
    createdBy: string;
  };
  'task.assigned': {
    taskId: string;
    userId: string;
    title: string;
    assignedBy: string;
  };
  'project.created': {
    projectId: string;
    ownerId: string;
    name: string;
  };
  'notification.created': {
    notificationId: string;
    userId: string;
    type: string;
  };
}

type EventName = keyof EventMap & string;
type EventListener<K extends EventName> = (payload: EventMap[K]) => void | Promise<void>;

interface HandlerMetrics {
  emitted: number;
  handled: number;
  failed: number;
}

/**
 * Production-grade typed event bus.
 *
 * - Fire-and-forget `emit` schedules handlers asynchronously and isolates errors.
 * - `emitAndWait` awaits all handlers and isolates errors (useful when callers need
 *   to guarantee handlers finished before continuing).
 * - Sync and async listeners are supported.
 * - Built-in metrics track emitted/handled/failed counts.
 */
class EventBus {
  private emitter = new EventEmitter();
  private metrics = new Map<EventName, HandlerMetrics>();

  private getMetric(event: EventName): HandlerMetrics {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, { emitted: 0, handled: 0, failed: 0 });
    }
    return this.metrics.get(event)!;
  }

  /**
   * Register a listener for an event.
   */
  on<K extends EventName>(event: K, listener: EventListener<K>): () => void {
    this.emitter.on(event, listener as (payload: unknown) => void);
    return () => this.off(event, listener);
  }

  /**
   * Register a one-time listener for an event.
   */
  once<K extends EventName>(event: K, listener: EventListener<K>): () => void {
    const wrapper: EventListener<K> = (payload) => {
      this.off(event, wrapper);
      return listener(payload);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove a specific listener for an event.
   */
  off<K extends EventName>(event: K, listener: EventListener<K>): void {
    this.emitter.off(event, listener as (payload: unknown) => void);
  }

  /**
   * Emit an event asynchronously (fire-and-forget).
   *
   * Each handler runs in its own promise; failures are logged and do not affect
   * other handlers or the caller.
   */
  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const metric = this.getMetric(event);
    metric.emitted++;

    const listeners = this.emitter.listeners(event) as EventListener<K>[];
    if (listeners.length === 0) {
      logger.debug('Event emitted with no listeners', { event });
      return;
    }

    logger.debug('Event emitted', { event, listenerCount: listeners.length });

    for (const listener of listeners) {
      Promise.resolve()
        .then(() => listener(payload))
        .then(() => {
          metric.handled++;
        })
        .catch((error) => {
          metric.failed++;
          logger.error('Event handler failed', {
            event,
            error: error instanceof Error ? error.message : error,
          });
        });
    }
  }

  /**
   * Emit an event and wait for all handlers to complete.
   *
   * Errors are logged and isolated; the returned promise never rejects because
   * of handler failures.
   */
  async emitAndWait<K extends EventName>(event: K, payload: EventMap[K]): Promise<void> {
    const metric = this.getMetric(event);
    metric.emitted++;

    const listeners = this.emitter.listeners(event) as EventListener<K>[];
    if (listeners.length === 0) {
      logger.debug('Event emitted with no listeners', { event });
      return;
    }

    logger.debug('Event emitted (awaiting handlers)', { event, listenerCount: listeners.length });

    const results = await Promise.allSettled(
      listeners.map((listener) => Promise.resolve().then(() => listener(payload)))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        metric.handled++;
      } else {
        metric.failed++;
        logger.error('Event handler failed', {
          event,
          error: result.reason instanceof Error ? result.reason.message : result.reason,
        });
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or for all events.
   */
  removeAllListeners(event?: EventName): void {
    this.emitter.removeAllListeners(event);
  }

  /**
   * Get current metrics for emitted events.
   */
  getMetrics(): Record<EventName, HandlerMetrics> {
    const snapshot: Partial<Record<EventName, HandlerMetrics>> = {};
    for (const [event, metric] of this.metrics.entries()) {
      snapshot[event] = { ...metric };
    }
    return snapshot as Record<EventName, HandlerMetrics>;
  }

  /**
   * Clear all listeners and metrics. Useful for testing.
   */
  clear(): void {
    this.emitter.removeAllListeners();
    this.metrics.clear();
  }
}

export const eventBus = new EventBus();
