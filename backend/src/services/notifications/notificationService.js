import { sendAlarm } from '../telegramBotService.js';
import { sendEmail, isEmailConfigured } from './emailProvider.js';
import { sendWebhook } from './webhookProvider.js';
import { buildDistributionPlan } from './distributionPolicy.js';
import { UserPreference, Device, User, TelegramDeviceConfig } from '../../models/index.js';
import { createChildLogger } from '../../config/pino.js';

const log = createChildLogger('NOTIFICATION');

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

/**
 * Despacha una alarma a todos los canales del Delivery Plan calculado por la
 * política de distribución (ISSUE-046-S2, ADR-032).
 *
 * Responsabilidades del orquestador: resolver el contexto (dispositivo,
 * preferencias del propietario, configuración Telegram por dispositivo, email
 * del usuario y configuración del proveedor email), construir el plan con
 * `buildDistributionPlan` y ejecutar cada entrega contra el proveedor
 * correspondiente. No contiene reglas de ruteo propias.
 *
 * @param {{ id: number, deviceId: number, severity: string, type: string, message?: string, sensorType?: string, currentValue?: number, thresholdMin?: number, thresholdMax?: number }} alarm Alarma emitida por el control engine.
 * @returns {Promise<void>}
 */
export async function notifyAlarm(alarm) {
  if (!alarm || !alarm.deviceId) return;

  try {
    const device = await Device.findByPk(alarm.deviceId);
    if (!device || !device.userId) return;

    const ownerPrefs = await UserPreference.findOne({ where: { userId: device.userId } });
    if (!ownerPrefs) return;

    let telegramDeviceConfig = null;
    if (ownerPrefs.telegramEnabled && ownerPrefs.telegramChatId) {
      telegramDeviceConfig = await TelegramDeviceConfig.findOne({ where: { deviceId: alarm.deviceId } });
    }

    let userEmail = null;
    if (ownerPrefs.emailAlerts) {
      try {
        const user = await User.findByPk(device.userId, { attributes: ['email'] });
        userEmail = user?.email || null;
      } catch (err) {
        log.error({ module: 'NOTIFICATION', event: 'FAILED', channel: 'email', alarmId: alarm.id, error: err.message });
      }
    }

    const plan = buildDistributionPlan({
      event: alarm,
      ownerPrefs,
      telegramDeviceConfig,
      userEmail,
      emailConfigured: isEmailConfigured(),
    });

    for (const item of plan) {
      try {
        if (item.channel === 'telegram') {
          await sendAlarm(item.chatId, alarm, device);
        } else if (item.channel === 'email') {
          await sendEmail({
            to: item.to,
            subject: `[Mush2] ${alarm.severity} — ${alarm.type}`,
            html: formatAlarmHtml(alarm, device),
          });
        } else if (item.channel === 'webhook') {
          await sendWebhook({
            url: item.url,
            payload: { alarm, device: { deviceId: device.deviceId, chamberName: device.chamberName } },
          });
        }
        log.info({ module: 'NOTIFICATION', event: 'SENT', channel: item.channel, alarmId: alarm.id, deviceId: alarm.deviceId });
      } catch (err) {
        log.error({ module: 'NOTIFICATION', event: 'FAILED', channel: item.channel, alarmId: alarm.id, error: err.message });
      }
    }
  } catch (err) {
    log.error({ module: 'NOTIFICATION', event: 'DISPATCH_ERROR', error: err.message }, 'Notification dispatch failed');
  }
}
