"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
const logger_1 = require("../config/logger");
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
    emitter = new events_1.EventEmitter();
    metrics = new Map();
    getMetric(event) {
        if (!this.metrics.has(event)) {
            this.metrics.set(event, { emitted: 0, handled: 0, failed: 0 });
        }
        return this.metrics.get(event);
    }
    /**
     * Register a listener for an event.
     */
    on(event, listener) {
        this.emitter.on(event, listener);
        return () => this.off(event, listener);
    }
    /**
     * Register a one-time listener for an event.
     */
    once(event, listener) {
        const wrapper = (payload) => {
            this.off(event, wrapper);
            return listener(payload);
        };
        return this.on(event, wrapper);
    }
    /**
     * Remove a specific listener for an event.
     */
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    /**
     * Emit an event asynchronously (fire-and-forget).
     *
     * Each handler runs in its own promise; failures are logged and do not affect
     * other handlers or the caller.
     */
    emit(event, payload) {
        const metric = this.getMetric(event);
        metric.emitted++;
        const listeners = this.emitter.listeners(event);
        if (listeners.length === 0) {
            logger_1.logger.debug('Event emitted with no listeners', { event });
            return;
        }
        logger_1.logger.debug('Event emitted', { event, listenerCount: listeners.length });
        for (const listener of listeners) {
            Promise.resolve()
                .then(() => listener(payload))
                .then(() => {
                metric.handled++;
            })
                .catch((error) => {
                metric.failed++;
                logger_1.logger.error('Event handler failed', {
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
    async emitAndWait(event, payload) {
        const metric = this.getMetric(event);
        metric.emitted++;
        const listeners = this.emitter.listeners(event);
        if (listeners.length === 0) {
            logger_1.logger.debug('Event emitted with no listeners', { event });
            return;
        }
        logger_1.logger.debug('Event emitted (awaiting handlers)', { event, listenerCount: listeners.length });
        const results = await Promise.allSettled(listeners.map((listener) => Promise.resolve().then(() => listener(payload))));
        for (const result of results) {
            if (result.status === 'fulfilled') {
                metric.handled++;
            }
            else {
                metric.failed++;
                logger_1.logger.error('Event handler failed', {
                    event,
                    error: result.reason instanceof Error ? result.reason.message : result.reason,
                });
            }
        }
    }
    /**
     * Remove all listeners for a specific event, or for all events.
     */
    removeAllListeners(event) {
        this.emitter.removeAllListeners(event);
    }
    /**
     * Get current metrics for emitted events.
     */
    getMetrics() {
        const snapshot = {};
        for (const [event, metric] of this.metrics.entries()) {
            snapshot[event] = { ...metric };
        }
        return snapshot;
    }
    /**
     * Clear all listeners and metrics. Useful for testing.
     */
    clear() {
        this.emitter.removeAllListeners();
        this.metrics.clear();
    }
}
exports.eventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map