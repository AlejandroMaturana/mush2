/**
 * Taxonomía de errores del subsistema Telegram (ISSUE-048).
 *
 * Centraliza la clasificación de errores de la API de Telegram y de red para
 * que el resto del subsistema no repita heurísticas ad hoc. No implementa
 * reintentos ni modifica la semántica de envío: solo clasifica.
 *
 * @typedef {Object} ClassifiedTelegramError
 * @property {string} kind - Clasificación simbólica (INVALID_TOKEN, POLLING_CONFLICT, ...).
 * @property {number|string|null} code - Código HTTP o código de red del error, si existe.
 * @property {boolean} retryable - Indica si un reintento tendría sentido (informativo; no se reintenta).
 * @property {string} stateEffect - Efecto de estado asociado (failed | degraded | unknown). Informativo.
 * @property {string} description - Mensaje legible para logs.
 */

const NETWORK_CODES = new Set([
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EPIPE',
]);

/**
 * Clasifica un error de la API de Telegram (o de red) en una estructura
 * consistente. Nunca lanza.
 *
 * @param {unknown} error - Error capturado (p. ej. de `polling_error`, `getMe`, `sendMessage`).
 * @returns {ClassifiedTelegramError}
 */
export function classifyTelegramError(error) {
  const err = error && typeof error === 'object' ? error : {};
  const code = err?.response?.status ?? err?.code ?? null;
  const description = err?.response?.body?.description || err?.message || String(error ?? 'Unknown error');

  if (code === 401) {
    return { kind: 'INVALID_TOKEN', code, retryable: false, stateEffect: 'failed', description };
  }
  if (code === 403) {
    return { kind: 'FORBIDDEN', code, retryable: false, stateEffect: 'failed', description };
  }
  if (code === 409) {
    return { kind: 'POLLING_CONFLICT', code, retryable: true, stateEffect: 'degraded', description };
  }
  if (code === 429) {
    return { kind: 'RATE_LIMITED', code, retryable: true, stateEffect: 'degraded', description };
  }
  if (typeof code === 'string' && NETWORK_CODES.has(code)) {
    return { kind: 'NETWORK_ERROR', code, retryable: true, stateEffect: 'degraded', description };
  }
  if (typeof code === 'number' && code >= 500) {
    return { kind: 'TELEGRAM_5XX', code, retryable: true, stateEffect: 'degraded', description };
  }
  if (typeof code === 'number' && code >= 400) {
    return { kind: 'TELEGRAM_API_ERROR', code, retryable: false, stateEffect: 'degraded', description };
  }
  return { kind: 'INTERNAL_ERROR', code: null, retryable: false, stateEffect: 'unknown', description };
}
