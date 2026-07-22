/**
 * Application readiness state tracker.
 *
 * States:
 *   - starting: DB authenticated, HTTP listening, secondary services initializing
 *   - ready:    all critical + secondary services initialized
 *   - degraded: at least one secondary service failed but API is operational
 */

const state = {
  status: 'starting',
  startedAt: new Date().toISOString(),
  readyAt: null,
  services: {},
  error: null,
};

export function getReadiness() {
  return { ...state };
}

export function markServiceStarted(name) {
  state.services[name] = { status: 'ok', since: new Date().toISOString() };
  recalculate();
}

export function markServiceFailed(name, error) {
  state.services[name] = { status: 'error', error: error?.message || String(error), since: new Date().toISOString() };
  recalculate();
}

export function markReady() {
  state.status = 'ready';
  state.readyAt = new Date().toISOString();
}

function recalculate() {
  const values = Object.values(state.services);
  if (values.length === 0) return;
  const anyFailed = values.some((s) => s.status === 'error');
  if (state.status === 'ready' || anyFailed) {
    state.status = anyFailed ? 'degraded' : 'ready';
  }
}
