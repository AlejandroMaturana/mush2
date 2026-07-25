import { evaluateAllDevices } from '../services/deviceHealthService.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('HEALTH_WATCHDOG');

const CHECK_INTERVAL = 30_000;
let handle = null;

async function checkDevices() {
  try {
    const transitions = await evaluateAllDevices();
    if (transitions.length > 0) {
      log.info({ count: transitions.length, transitions }, 'Devices transitioned');
    }
  } catch (err) {
    log.error({ error: err.message }, 'Error evaluating devices');
  }
}

export function startOfflineWatchdog() {
  if (handle) return;
  checkDevices();
  handle = setInterval(checkDevices, CHECK_INTERVAL);
  log.info({ checkIntervalSec: CHECK_INTERVAL / 1000 }, 'Watchdog started');
}

export function stopOfflineWatchdog() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
