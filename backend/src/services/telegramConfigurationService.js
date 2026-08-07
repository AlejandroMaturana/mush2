import { SystemSetting } from '../models/index.js';
import { env } from '../config/env.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('TELEGRAM_CONFIG');

const TOKEN_KEY = 'telegram_bot_token';
const USERNAME_KEY = 'telegram_bot_username';

/**
 * Servicio de configuración del bot de Telegram (ISSUE-048).
 *
 * Responsable únicamente de obtener, guardar y validar la configuración del bot
 * en `SystemSetting` con fallback de entorno. NO administra runtime, no conoce
 * `TelegramBot`, no gestiona polling ni envía mensajes: la ejecución vive en
 * `telegramBotService`, que recibe la configuración desde aquí.
 *
 * Los valores "efectivos" combinan el valor persistido con el fallback de
 * entorno (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME`). Los campos `stored*`
 * y `tokenConfigured` reflejan únicamente lo persistido, para mantener el
 * comportamiento de `GET /telegram/bot-status`.
 */

/**
 * Lee la configuración persistida y calcula los valores efectivos.
 * @returns {Promise<{ token: string, username: string, storedToken: string, storedUsername: string, tokenConfigured: boolean }>}
 */
export async function getBotConfig() {
  const [tokenSetting, usernameSetting] = await Promise.all([
    SystemSetting.findOne({ where: { key: TOKEN_KEY } }),
    SystemSetting.findOne({ where: { key: USERNAME_KEY } }),
  ]);
  const storedToken = tokenSetting?.value || '';
  const storedUsername = usernameSetting?.value || '';
  return {
    token: storedToken || env.TELEGRAM_BOT_TOKEN,
    username: storedUsername || env.TELEGRAM_BOT_USERNAME,
    storedToken,
    storedUsername,
    tokenConfigured: !!(storedToken || env.TELEGRAM_BOT_TOKEN),
  };
}

/**
 * Persiste el token y username del bot (upsert idempotente en SystemSetting).
 * @param {{ token: string, username?: string }} config
 * @returns {Promise<{ token: string, username: string }>}
 */
export async function saveBotConfig({ token, username }) {
  const [tokenSetting] = await SystemSetting.findOrCreate({
    where: { key: TOKEN_KEY },
    defaults: { key: TOKEN_KEY, value: '', type: 'string', label: 'Telegram Bot Token', category: 'integration' },
  });
  const [usernameSetting] = await SystemSetting.findOrCreate({
    where: { key: USERNAME_KEY },
    defaults: { key: USERNAME_KEY, value: '', type: 'string', label: 'Telegram Bot Username', category: 'integration' },
  });

  await tokenSetting.update({ value: token });
  await usernameSetting.update({ value: username || '' });

  log.info({ event: 'CONFIG_SAVED' }, 'Telegram bot configuration saved');
  return { token, username: username || '' };
}

/**
 * Valida que exista configuración usable (persistida o de entorno).
 * @returns {Promise<boolean>}
 */
export async function isConfigured() {
  const config = await getBotConfig();
  return config.tokenConfigured;
}
