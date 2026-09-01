import TelegramBot from 'node-telegram-bot-api';
import { Op } from 'sequelize';
import { UserPreference, User } from '../models/index.js';
import { createChildLogger } from '../config/pino.js';
import { classifyTelegramError } from './telegramErrors.js';

const log = createChildLogger('TELEGRAM');

// ── Ciclo de vida explícito (ISSUE-047) ────────────────────────────
export const BOT_STATES = Object.freeze({
  DISABLED: 'disabled',
  STARTING: 'starting',
  READY: 'ready',
  DEGRADED: 'degraded',
  STOPPED: 'stopped',
  FAILED: 'failed',
});

const ALLOWED_TRANSITIONS = {
  [BOT_STATES.DISABLED]: new Set([BOT_STATES.STARTING]),
  [BOT_STATES.STARTING]: new Set([BOT_STATES.READY, BOT_STATES.FAILED, BOT_STATES.STOPPED, BOT_STATES.DISABLED]),
  [BOT_STATES.READY]: new Set([BOT_STATES.DEGRADED, BOT_STATES.STOPPED, BOT_STATES.STARTING, BOT_STATES.DISABLED]),
  [BOT_STATES.DEGRADED]: new Set([BOT_STATES.READY, BOT_STATES.STOPPED, BOT_STATES.STARTING, BOT_STATES.DISABLED]),
  [BOT_STATES.STOPPED]: new Set([BOT_STATES.STARTING, BOT_STATES.DISABLED]),
  [BOT_STATES.FAILED]: new Set([BOT_STATES.STARTING, BOT_STATES.DISABLED]),
};

/**
 * Contexto interno único del runtime del bot (ISSUE-048).
 *
 * Reemplaza las variables globales dispersas (bot / isReady / currentUsername /
 * lastError) por una sola estructura. No se exporta: es un detalle interno del
 * servicio y el resto del sistema accede a él únicamente vía getBotStatus().
 *
 * Este servicio NO lee `SystemSetting`: la configuración llega por parámetro
 * desde `telegramConfigurationService` (initBot/reconfigureBot reciben
 * token/username resueltos por el caller).
 *
 * @typedef {Object} TelegramRuntimeState
 * @property {TelegramBot|null} instance - Instancia activa del bot.
 * @property {number} generation - Guard de generación: descarta resultados async obsoletos.
 * @property {string} state - Estado del ciclo de vida (BOT_STATES).
 * @property {boolean} running - `true` en ready/degraded (polling y envío desacoplados).
 * @property {string} username - Username del bot verificado.
 * @property {string|null} lastStateChangeAt - ISO timestamp del último cambio de estado.
 * @property {string|null} startedAt - ISO timestamp del último arranque.
 * @property {string|null} stoppedAt - ISO timestamp de la última detención.
 * @property {string|null} lastError - Último error registrado.
 * @property {string|null} lastErrorAt - ISO timestamp del último error.
 * @property {number} reconfigures - Cantidad de reconfigureBot() completados.
 * @property {number} messagesSent - Mensajes enviados con éxito.
 * @property {number} messagesFailed - Envíos fallidos.
 * @property {number} pollingErrors - Errores de polling registrados.
 * @property {string|null} lastDeliveryAt - ISO timestamp de la última entrega.
 */
function createRuntimeState() {
  return {
    instance: null,
    generation: 0,
    state: BOT_STATES.DISABLED,
    running: false,
    username: '',
    lastStateChangeAt: null,
    startedAt: null,
    stoppedAt: null,
    lastError: null,
    lastErrorAt: null,
    reconfigures: 0,
    messagesSent: 0,
    messagesFailed: 0,
    pollingErrors: 0,
    lastDeliveryAt: null,
  };
}

let runtime = createRuntimeState();

// Promise queue: serializa init/reconfigure/stop para que nunca se ejecuten en
// paralelo. Esto elimina el origen del error HTTP 409 "terminated by other
// getUpdates request" (dos instancias haciendo polling a la vez).
let lifecycleQueue = Promise.resolve();

function enqueue(operation) {
  const run = lifecycleQueue.then(operation, operation);
  lifecycleQueue = run.then(() => undefined, () => undefined);
  return run;
}

function transitionTo(to, extra = {}) {
  const from = runtime.state;
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    log.warn({ event: 'INVALID_TRANSITION', from, to }, 'Invalid state transition ignored');
    return false;
  }
  runtime.state = to;
  runtime.running = to === BOT_STATES.READY || to === BOT_STATES.DEGRADED;
  runtime.lastStateChangeAt = new Date().toISOString();
  Object.assign(runtime, extra);
  log.info({ event: 'STATE_CHANGE', from, to, running: runtime.running }, `Telegram bot state ${from} -> ${to}`);
  return true;
}

/**
 * Detiene el polling de la instancia actual (await) y la libera.
 * Invariante: nunca puede existir más de una instancia con polling activo.
 */
async function destroyInstance() {
  const current = runtime.instance;
  runtime.instance = null;
  if (current) {
    try {
      await current.stopPolling();
    } catch (err) {
      log.error({ event: 'STOP_POLLING_ERROR', error: err.message, stack: err.stack }, 'Error stopping polling');
    }
  }
}

function handlePollingError(err) {
  runtime.pollingErrors += 1;
  const msg = err?.response?.body?.description || err?.message || String(err);
  runtime.lastError = msg;
  runtime.lastErrorAt = new Date().toISOString();
  if (runtime.state === BOT_STATES.READY) {
    transitionTo(BOT_STATES.DEGRADED);
  }
  const classification = classifyTelegramError(err);
  log.error({
    event: 'POLLING_ERROR',
    error: msg,
    errorKind: classification.kind,
    errorCode: classification.code,
    retryable: classification.retryable,
    pollingErrors: runtime.pollingErrors,
    state: runtime.state,
  }, 'Polling error');
}

/**
 * Crea una instancia, verifica el token (getMe) y arranca polling.
 * Única ruta hacia los estados READY/FAILED; toda recuperación pasa por STARTING.
 */
async function startBot(token, botUsername) {
  await destroyInstance();
  transitionTo(BOT_STATES.STARTING);

  let instance;
  try {
    runtime.generation += 1;
    const generation = runtime.generation;
    instance = new TelegramBot(token, { polling: true });
    const me = await instance.getMe();
    runtime.instance = instance;
    runtime.username = me.username || botUsername || 'unknown';
    runtime.lastError = null;
    runtime.lastErrorAt = null;
    runtime.startedAt = new Date().toISOString();
    registerHandlers(instance, generation);
    transitionTo(BOT_STATES.READY);
    log.info({ event: 'BOT_VERIFIED', username: runtime.username }, `Bot @${runtime.username} verified — starting polling`);
    return instance;
  } catch (err) {
    const detail = err?.original?.message || err?.cause?.message || err?.message || String(err);
    runtime.lastError = detail;
    runtime.lastErrorAt = new Date().toISOString();
    runtime.instance = null;
    if (instance) {
      try { await instance.stopPolling(); } catch {}
    }
    transitionTo(BOT_STATES.FAILED);
    const classification = classifyTelegramError(err);
    log.error({
      event: 'INIT_ERROR',
      error: detail,
      errorKind: classification.kind,
      errorCode: classification.code,
      stack: err.stack,
    }, 'Error initializing bot');
    return null;
  }
}

/**
 * Ruta de arranque serializada. Sin token → disabled (nada se crea).
 */
async function startLifecycle(token, botUsername, { countReconfigure }) {
  if (countReconfigure) runtime.reconfigures += 1;
  if (!token) {
    await destroyInstance();
    if (runtime.state !== BOT_STATES.DISABLED) {
      transitionTo(BOT_STATES.DISABLED, { username: '', startedAt: null });
    }
    return null;
  }
  return startBot(token, botUsername);
}

export function isBotReady() {
  return runtime.running;
}

export function getBotStatus() {
  const now = Date.now();
  const startedMs = runtime.startedAt ? new Date(runtime.startedAt).getTime() : null;
  const uptimeSeconds = startedMs ? Math.max(0, Math.floor((now - startedMs) / 1000)) : 0;
  return {
    state: runtime.state,
    running: runtime.running,
    username: runtime.username,
    lastError: runtime.lastError,
    lastStateChangeAt: runtime.lastStateChangeAt,
    startedAt: runtime.startedAt,
    stoppedAt: runtime.stoppedAt,
    lastErrorAt: runtime.lastErrorAt,
    metrics: {
      messagesSent: runtime.messagesSent,
      messagesFailed: runtime.messagesFailed,
      pollingErrors: runtime.pollingErrors,
      lastDeliveryAt: runtime.lastDeliveryAt,
      uptimeSeconds,
      reconfigures: runtime.reconfigures,
    },
  };
}

/**
 * Arranca el bot. Serializado: si hay otra operación de ciclo de vida en curso,
 * espera a que termine. Sin token no crea ninguna instancia.
 */
export async function initBot(token, botUsername) {
  return enqueue(() => startLifecycle(token, botUsername, { countReconfigure: false }));
}

/**
 * Reconfigura el bot con nuevas credenciales. Idempotente y libre de carrera:
 * detiene el polling actual (await) antes de crear la nueva instancia.
 */
export async function reconfigureBot(token, botUsername) {
  return enqueue(() => startLifecycle(token, botUsername, { countReconfigure: true }));
}

/**
 * Detiene el bot: await bot.stopPolling() antes de liberar la instancia.
 */
export async function stopBot() {
  return enqueue(async () => {
    await destroyInstance();
    runtime.stoppedAt = new Date().toISOString();
    if (runtime.state === BOT_STATES.READY || runtime.state === BOT_STATES.DEGRADED || runtime.state === BOT_STATES.STARTING) {
      transitionTo(BOT_STATES.STOPPED);
    }
    log.info({ event: 'BOT_STOPPED', state: runtime.state }, 'Bot stopped');
  });
}

export async function sendMessage(chatId, text, parseMode = 'Markdown') {
  const instance = runtime.instance;
  if (!instance || !runtime.running) return false;
  try {
    await instance.sendMessage(chatId, text, { parse_mode: parseMode });
    runtime.messagesSent += 1;
    runtime.lastDeliveryAt = new Date().toISOString();
    return true;
  } catch (err) {
    runtime.messagesFailed += 1;
    runtime.lastError = err.message;
    runtime.lastErrorAt = new Date().toISOString();
    const classification = classifyTelegramError(err);
    log.error({
      event: 'SEND_MESSAGE_ERROR',
      error: err.message,
      errorKind: classification.kind,
      errorCode: classification.code,
      stack: err.stack,
    }, 'Error sending message');
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

/**
 * Registra los handlers de comandos y eventos para una instancia dada.
 * El flujo /link, /status y /unlink no cambia (CA5 del ISSUE-047).
 *
 * Generation Guard: los handlers capturan la generación de la instancia en el
 * momento de registrarse. Si el runtime ya fue reemplazado por una instancia más
 * nueva (reconfigure/init), los eventos tardíos de la instancia vieja se
 * descartan y no pueden mutar el estado de la generación actual.
 */
function registerHandlers(instance, generation) {
  const isCurrentGeneration = () => runtime.generation === generation;

  // Si el polling se recupera (llega un mensaje), degraded → ready.
  instance.on('message', () => {
    if (!isCurrentGeneration()) return;
    if (runtime.state === BOT_STATES.DEGRADED) {
      transitionTo(BOT_STATES.READY);
      log.info({ event: 'POLLING_RECOVERED' }, 'Polling recovered');
    }
  });

  instance.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const text = `🤖 *Mush2 Bot*\n\nComandos disponibles:\n• \`/link CODIGO\` — Vincular tu cuenta de Telegram\n• \`/status\` — Ver estado de vinculación\n• \`/unlink\` — Desvincular Telegram`;
    sendMessage(chatId, text);
  });

  instance.onText(/\/link (.+)/, async (msg, match) => {
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
        return sendMessage(chatId, '❌ Código inválido o expirado. Genera uno nuevo desde Mush2.');
      }

      await prefs.update({
        telegramChatId: String(chatId),
        telegramEnabled: true,
        telegramLinkToken: null,
        telegramLinkTokenExpires: null,
      });

      sendMessage(chatId, `✅ *¡Cuenta vinculada con éxito!*\n\nAhora recibirás alertas de tus dispositivos Mush2.`);
      log.info({ event: 'USER_LINKED', userId: prefs.userId, chatId }, `User ${prefs.userId} linked chat ${chatId}`);
    } catch (err) {
      log.error({ event: 'LINK_ERROR', error: err.message, stack: err.stack }, 'Error en /link');
      sendMessage(chatId, '❌ Error al vincular. Intenta de nuevo.');
    }
  });

  instance.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const prefs = await UserPreference.findOne({ where: { telegramChatId: String(chatId) } });
      if (prefs) {
        const user = await User.findByPk(prefs.userId, { attributes: ['username'] });
        sendMessage(chatId, `✅ *Vinculado*\n\nUsuario: \`${user?.username || '—'}\`\nChat ID: \`${chatId}\``);
      } else {
        sendMessage(chatId, '❌ No estás vinculado. Usa `/link CODIGO` con el código generado en Mush2.');
      }
    } catch (err) {
      log.error({ event: 'STATUS_ERROR', error: err.message, stack: err.stack }, 'Error en /status');
    }
  });

  instance.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const prefs = await UserPreference.findOne({ where: { telegramChatId: String(chatId) } });
      if (prefs) {
        await prefs.update({ telegramChatId: null, telegramEnabled: false });
        sendMessage(chatId, '✅ *Telegram desvinculado.*\n\nYa no recibirás alertas.');
      } else {
        sendMessage(chatId, '❌ No estás vinculado.');
      }
    } catch (err) {
      log.error({ event: 'UNLINK_ERROR', error: err.message, stack: err.stack }, 'Error en /unlink');
    }
  });

  instance.on('polling_error', (err) => {
    if (!isCurrentGeneration()) return;
    handlePollingError(err);
  });
}
