import { sendAlarm, notifyDeviceAlarm } from '../telegramService.js';
import { sendEmail, isEmailConfigured } from './emailProvider.js';
import { sendWebhook } from './webhookProvider.js';
import { UserPreference, Device, User } from '../../models/index.js';
import { createChildLogger } from '../../config/pino.js';

const log = createChildLogger('NOTIFICATION');

const SEVERITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function formatAlarmHtml(alarm, device) {
  const deviceName = device?.chamberName || device?.deviceId || '—';
  const sensorLabel = alarm.sensorType || 'System';
  const valueLine = alarm.currentValue != null ? `<p><strong>Valor:</strong> ${alarm.currentValue}</p>` : '';
  const thresholdLine = alarm.thresholdMin != null || alarm.thresholdMax != null
    ? `<p><strong>Umbral:</strong> ${alarm.thresholdMin ?? '—'} – ${alarm.thresholdMax ?? '—'}</p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${alarm.severity === 'CRITICAL' ? '#dc2626' : alarm.severity === 'HIGH' ? '#ea580c' : '#d97706'};">
        ${alarm.severity} — ${alarm.type}
      </h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Dispositivo</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${deviceName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Sensor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${sensorLabel}</td></tr>
        ${valueLine ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Valor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alarm.currentValue}</td></tr>` : ''}
        ${thresholdLine ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Umbral</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alarm.thresholdMin ?? '—'} – ${alarm.thresholdMax ?? '—'}</td></tr>` : ''}
      </table>
      <p style="color: #666; margin-top: 16px;"><em>${alarm.message}</em></p>
      <p style="color: #999; font-size: 12px;">Mush2 Monitoring — ${new Date().toISOString()}</p>
    </div>
  `;
}

export async function notifyAlarm(alarm) {
  if (!alarm || !alarm.deviceId) return;

  try {
    const device = await Device.findByPk(alarm.deviceId);
    if (!device || !device.userId) return;

    const ownerPrefs = await UserPreference.findOne({ where: { userId: device.userId } });
    if (!ownerPrefs) return;

    const minSeverity = ownerPrefs.minNotificationSeverity || 'MEDIUM';
    const alarmSev = SEVERITY_ORDER[alarm.severity] ?? 0;
    const minSev = SEVERITY_ORDER[minSeverity] ?? 1;
    if (alarmSev < minSev) return;

    // Telegram
    if (ownerPrefs.telegramEnabled && ownerPrefs.telegramChatId) {
      try {
        await notifyDeviceAlarm(alarm.deviceId, alarm);
        log.info({ module: 'NOTIFICATION', event: 'SENT', channel: 'telegram', alarmId: alarm.id, deviceId: alarm.deviceId });
      } catch (err) {
        log.error({ module: 'NOTIFICATION', event: 'FAILED', channel: 'telegram', alarmId: alarm.id, error: err.message });
      }
    }

    // Email
    if (ownerPrefs.emailAlerts && isEmailConfigured()) {
      try {
        const user = await User.findByPk(device.userId, { attributes: ['email'] });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: `[Mush2] ${alarm.severity} — ${alarm.type}`,
            html: formatAlarmHtml(alarm, device),
          });
          log.info({ module: 'NOTIFICATION', event: 'SENT', channel: 'email', alarmId: alarm.id, deviceId: alarm.deviceId });
        }
      } catch (err) {
        log.error({ module: 'NOTIFICATION', event: 'FAILED', channel: 'email', alarmId: alarm.id, error: err.message });
      }
    }

    // Webhook
    if (ownerPrefs.webhookUrl) {
      try {
        await sendWebhook({ url: ownerPrefs.webhookUrl, payload: { alarm, device: { deviceId: device.deviceId, chamberName: device.chamberName } } });
        log.info({ module: 'NOTIFICATION', event: 'SENT', channel: 'webhook', alarmId: alarm.id, deviceId: alarm.deviceId });
      } catch (err) {
        log.error({ module: 'NOTIFICATION', event: 'FAILED', channel: 'webhook', alarmId: alarm.id, error: err.message });
      }
    }
  } catch (err) {
    log.error({ module: 'NOTIFICATION', event: 'DISPATCH_ERROR', error: err.message }, 'Notification dispatch failed');
  }
}
