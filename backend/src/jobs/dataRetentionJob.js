import { purgeExpiredData } from '../services/dataRetentionService.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('DATA_RETENTION');

const INTERVAL = 60 * 60 * 1000;
let handle = null;
let running = false;

export async function runPurge() {
  if (running) return null;
  running = true;
  try {
    const counts = await purgeExpiredData();
    if (counts.deletedAudit > 0 || counts.deletedTelemetry > 0 || counts.deletedAlarms > 0) {
      log.info(counts, 'Purge completed');
    }
    return counts;
  } catch (err) {
    log.error({ error: err.message }, 'Purge failed');
    return null;
  } finally {
    running = false;
  }
}

export function startDataRetentionJob() {
  if (handle) return;
  runPurge();
  handle = setInterval(() => runPurge(), INTERVAL);
  handle.unref();
  log.info({ intervalMin: INTERVAL / 60000 }, 'Job started');
}

export function stopDataRetentionJob() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
