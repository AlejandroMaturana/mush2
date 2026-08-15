import { Op } from 'sequelize';
import { Device, Telemetry, Alarm, AuditLog, Subscription } from '../models/index.js';

const DEFAULT_RETENTION_DAYS = 30;

function cutoffFor(retentionDays, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

export async function purgeExpiredData({ now = new Date() } = {}) {
  const subs = await Subscription.findAll({
    where: { status: 'ACTIVE' },
    attributes: ['userId', 'dataRetentionDays'],
  });

  const retentionByUser = new Map();
  for (const sub of subs) {
    retentionByUser.set(sub.userId, sub.dataRetentionDays);
  }

  let deletedAudit = 0;
  for (const sub of subs) {
    const cutoff = cutoffFor(sub.dataRetentionDays, now);
    deletedAudit += await AuditLog.destroy({
      where: { userId: sub.userId, createdAt: { [Op.lt]: cutoff } },
    });
  }

  const devices = await Device.findAll({ attributes: ['id', 'userId'] });

  const deviceIdsByRetention = new Map();
  for (const device of devices) {
    const retention = retentionByUser.get(device.userId) ?? DEFAULT_RETENTION_DAYS;
    const ids = deviceIdsByRetention.get(retention) || [];
    ids.push(device.id);
    deviceIdsByRetention.set(retention, ids);
  }

  let deletedTelemetry = 0;
  let deletedAlarms = 0;

  for (const [retention, deviceIds] of deviceIdsByRetention) {
    const cutoff = cutoffFor(retention, now);
    deletedTelemetry += await Telemetry.destroy({
      where: { deviceId: { [Op.in]: deviceIds }, timestamp: { [Op.lt]: cutoff } },
    });
    deletedAlarms += await Alarm.destroy({
      where: { deviceId: { [Op.in]: deviceIds }, createdAt: { [Op.lt]: cutoff } },
    });
  }

  return { deletedAudit, deletedTelemetry, deletedAlarms };
}
