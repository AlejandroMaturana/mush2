import { Op } from 'sequelize';
import { Subscription, AuditLog, Telemetry, Alarm } from '../models/index.js';

const INTERVAL = 60 * 60 * 1000;
let handle = null;

export function startDataRetentionJob() {
  if (handle) return;
  runPurge().catch(() => {});
  handle = setInterval(() => runPurge().catch(() => {}), INTERVAL);
  console.log(`[DATA_RETENTION] Job iniciado cada ${INTERVAL / 60000}min`);
}

export function stopDataRetentionJob() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}

async function runPurge() {
  const subs = await Subscription.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['userId', 'plan', 'dataRetentionDays'],
  });

  if (subs.length === 0) {
    console.log('[DATA_RETENTION] No hay suscripciones activas — saltando purge');
    return;
  }

  let deletedAudit = 0;
  let minRetention = Infinity;

  for (const sub of subs) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sub.dataRetentionDays);

    const deleted = await AuditLog.destroy({
      where: { userId: sub.userId, createdAt: { [Op.lt]: cutoff } },
    });
    deletedAudit += deleted;

    if (sub.dataRetentionDays < minRetention) {
      minRetention = sub.dataRetentionDays;
    }
  }

  const globalCutoff = new Date();
  globalCutoff.setDate(globalCutoff.getDate() - minRetention);

  const deletedTelemetry = await Telemetry.destroy({
    where: { timestamp: { [Op.lt]: globalCutoff } },
  });

  const deletedAlarms = await Alarm.destroy({
    where: { createdAt: { [Op.lt]: globalCutoff } },
  });

  if (deletedAudit > 0 || deletedTelemetry > 0 || deletedAlarms > 0) {
    console.log(`[DATA_RETENTION] Purge completado: audit=${deletedAudit}, telemetry=${deletedTelemetry}, alarms=${deletedAlarms} (minRetention=${minRetention}d)`);
  }
}
