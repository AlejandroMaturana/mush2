import { evaluateAllDevices } from '../services/deviceHealthService.js';

const CHECK_INTERVAL = 30_000;
let handle = null;

async function checkDevices() {
  try {
    const transitions = await evaluateAllDevices();
    if (transitions.length > 0) {
      console.log(`[HEALTH_WATCHDOG] ${transitions.length} device(s) transitioned:`,
        transitions.map(t => `${t.deviceId} ${t.from}→${t.to}`).join(', '));
    }
  } catch (err) {
    console.error('[HEALTH_WATCHDOG] Error evaluating devices:', err.message);
  }
}

export function startOfflineWatchdog() {
  if (handle) return;
  checkDevices();
  handle = setInterval(checkDevices, CHECK_INTERVAL);
  console.log(`[HEALTH_WATCHDOG] Watchdog started (check every ${CHECK_INTERVAL / 1000}s)`);
}

export function stopOfflineWatchdog() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
