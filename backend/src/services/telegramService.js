import TelegramBot from 'node-telegram-bot-api';
import { Op } from 'sequelize';
import { UserPreference, Device, TelegramDeviceConfig, User } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';

let bot = null;
let isReady = false;
let currentUsername = '';
let lastError = null;
const log = createChildLogger('TELEGRAM');

export function isBotReady() {
  return isReady;
}

export function getBotStatus() {
  return { running: isReady, username: currentUsername, lastError };
}

export async function reconfigureBot(token, botUsername) {
  if (bot) {
    try { bot.stopPolling(); } catch {}
    bot = null;
    isReady = false;
  }
  lastError = null;
  return initBot(token, botUsername);
}

export async function initBot(token, botUsername) {
  if (!token) {
    log.info({ event: 'NO_TOKEN' }, 'No token configured — bot disabled');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    const me = await bot.getMe();
    isReady = true;
    currentUsername = me.username || botUsername || 'unknown';
    lastError = null;
    log.info({ event: 'BOT_VERIFIED', username: currentUsername }, `Bot @${currentUsername} verified — starting polling`);

    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const text = `🤖 *Mush2 Bot*\n\nComandos disponibles:\n• \`/link CODIGO\` — Vincular tu cuenta de Telegram\n• \`/status\` — Ver estado de vinculación\n• \`/unlink\` — Desvincular Telegram`;
      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
    });

    bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const code = match[1].trim().toUpperCase();

      try {
        const prefs = await UserPreference.findOne({
          where: {
            telegramLinkToken: code,
            telegramLinkTokenExpires: { [Op.gt]: new Date() },
          },
        });

        if (!prefs) {
          return bot.sendMessage(chatId, '❌ Código inválido o expirado. Genera uno nuevo desde Mush2.').catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        }

        await prefs.update({
          telegramChatId: String(chatId),
          telegramEnabled: true,
          telegramLinkToken: null,
          telegramLinkTokenExpires: null,
        });

        bot.sendMessage(chatId, `✅ *¡Cuenta vinculada con éxito!*\n\nAhora recibirás alertas de tus dispositivos Mush2.`, { parse_mode: 'Markdown' }).catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        log.info({ event: 'USER_LINKED', userId: prefs.userId, chatId }, `User ${prefs.userId} linked chat ${chatId}`);
      } catch (err) {
        log.error({ module: 'TELEGRAM', event: 'LINK_ERROR', error: err.message }, 'Error en /link');
        bot.sendMessage(chatId, '❌ Error al vincular. Intenta de nuevo.').catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
      }
    });

    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const prefs = await UserPreference.findOne({ where: { telegramChatId: String(chatId) } });
        if (prefs) {
          const user = await User.findByPk(prefs.userId, { attributes: ['username'] });
          bot.sendMessage(chatId, `✅ *Vinculado*\n\nUsuario: \`${user?.username || '—'}\`\nChat ID: \`${chatId}\``, { parse_mode: 'Markdown' }).catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        } else {
          bot.sendMessage(chatId, '❌ No estás vinculado. Usa `/link CODIGO` con el código generado en Mush2.', { parse_mode: 'Markdown' }).catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        }
      } catch (err) {
        log.error({ module: 'TELEGRAM', event: 'STATUS_ERROR', error: err.message }, 'Error en /status');
      }
    });

    bot.onText(/\/unlink/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const prefs = await UserPreference.findOne({ where: { telegramChatId: String(chatId) } });
        if (prefs) {
          await prefs.update({ telegramChatId: null, telegramEnabled: false });
          bot.sendMessage(chatId, '✅ *Telegram desvinculado.*\n\nYa no recibirás alertas.', { parse_mode: 'Markdown' }).catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        } else {
          bot.sendMessage(chatId, '❌ No estás vinculado.').catch(err => log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'sendMessage error'));
        }
      } catch (err) {
        log.error({ module: 'TELEGRAM', event: 'UNLINK_ERROR', error: err.message }, 'Error en /unlink');
      }
    });

    bot.on('polling_error', (err) => {
      const msg = err?.response?.body?.description || err?.message || String(err);
      lastError = msg;
      isReady = false;
      log.error({ module: 'TELEGRAM', event: 'POLLING_ERROR', error: msg }, 'Polling error');
    });

    return bot;
  } catch (err) {
    log.error({ module: 'TELEGRAM', event: 'INIT_ERROR', error: err.message }, 'Error initializing bot');
    return null;
  }
}

export function stopBot() {
  if (bot) {
    bot.stopPolling();
    bot = null;
    isReady = false;
    currentUsername = '';
    lastError = null;
    log.info({ event: 'BOT_STOPPED' }, 'Bot stopped');
  }
}

export async function sendMessage(chatId, text, parseMode = 'Markdown') {
  if (!bot || !isReady) return false;
  try {
    await bot.sendMessage(chatId, text, { parse_mode: parseMode });
    return true;
  } catch (err) {
    log.error({ module: 'TELEGRAM', event: 'SEND_MESSAGE_ERROR', error: err.message }, 'Error sending message');
    return false;
  }
}

export async function sendAlarm(chatId, alarm, device) {
  const severityEmoji = { LOW: '🟡', MEDIUM: '🟠', HIGH: '🔴', CRITICAL: '🚨' };
  const emoji = severityEmoji[alarm.severity] || '⚠️';
  const sensorLabel = alarm.sensorType ? alarm.sensorType : 'System';
  const deviceName = device?.chamberName || device?.deviceId || '—';
  const valueLine = alarm.currentValue != null ? `Valor: \`${alarm.currentValue}\`` : '';
  const thresholdLine = alarm.thresholdMin != null || alarm.thresholdMax != null
    ? `Umbral: ${alarm.thresholdMin ?? '—'} – ${alarm.thresholdMax ?? '—'}`
    : '';

  const text = `${emoji} *${alarm.severity} — ${alarm.type}*\n` +
    `Dispositivo: \`${deviceName}\`\n` +
    `Sensor: \`${sensorLabel}\`\n` +
    `${valueLine}${valueLine ? '\n' : ''}` +
    `${thresholdLine}${thresholdLine ? '\n' : ''}` +
    `_${alarm.message}_`;

  return sendMessage(chatId, text);
}

export async function notifyDeviceAlarm(deviceId, alarm) {
  try {
    const config = await TelegramDeviceConfig.findOne({ where: { deviceId, enabled: true } });
    if (!config) return;

    const severityOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    const minSev = severityOrder[config.minSeverity] ?? 1;
    const alarmSev = severityOrder[alarm.severity] ?? 0;
    if (alarmSev < minSev) return;

    const typeMap = {
      SENSOR_FAULT: config.alertOnFault,
      OUT_OF_RANGE: config.alertOnRange,
      DISCONNECTED: config.alertOnDisconnect,
      SYSTEM_ERROR: config.alertOnSystem,
      THRESHOLD_CROSSED: config.alertOnRange,
    };
    if (typeMap[alarm.type] === false) return;

    const device = await Device.findByPk(deviceId);
    if (!device) return;

    const ownerId = device.userId;
    if (!ownerId) return;

    const prefs = await UserPreference.findOne({
      where: { userId: ownerId, telegramEnabled: true, telegramChatId: { [Op.ne]: null } },
    });

    if (prefs?.telegramChatId) {
      await sendAlarm(prefs.telegramChatId, alarm, device);
    }
  } catch (err) {
    log.error({ module: 'TELEGRAM', event: 'NOTIFY_ERROR', error: err.message }, 'Error in notifyDeviceAlarm');
  }
}
