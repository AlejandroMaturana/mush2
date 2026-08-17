import { EventEmitter } from 'events';

const MAX_LISTENERS = 50;

export const events = new EventEmitter();
events.setMaxListeners(MAX_LISTENERS);

events.on('error', (err) => {
  console.error('[EventBus] Unhandled listener error:', err.message || err);
});

const originalEmit = events.emit.bind(events);
events.emit = function safeEmit(event, ...args) {
  try {
    return originalEmit(event, ...args);
  } catch (err) {
    console.error(`[EventBus] Error in listener for "${event}":`, err.message || err);
    return false;
  }
};
