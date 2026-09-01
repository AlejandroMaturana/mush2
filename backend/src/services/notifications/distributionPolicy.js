// Vocabulario canónico de severidad del dominio (Alarm): LOW < MEDIUM < HIGH < CRITICAL.
export const SEVERITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// Mapeo del vocabulario de la UI (UserPreference.minAlertSeverity) al vocabulario canónico del dominio.
const USER_SEVERITY_RANK = {
  info: SEVERITY_ORDER.LOW,
  warning: SEVERITY_ORDER.MEDIUM,
  critical: SEVERITY_ORDER.CRITICAL,
};

// Mapeo de tipos de evento de alarma al flag de alerta por dispositivo de Telegram.
const TELEGRAM_TYPE_FLAG = {
  SENSOR_FAULT: 'alertOnFault',
  OUT_OF_RANGE: 'alertOnRange',
  DISCONNECTED: 'alertOnDisconnect',
  SYSTEM_ERROR: 'alertOnSystem',
  THRESHOLD_CROSSED: 'alertOnRange',
};

/**
 * Construye el Delivery Plan de una notificación: la decisión pura de
 * «quién debe enterarse» (canales + destinatarios) para un evento dado,
 * sin I/O, sin base de datos y sin invocar proveedores.
 *
 * Política de distribución (ISSUE-046-S2, ADR-032):
 *  1. Gate global de severidad: `UserPreference.minAlertSeverity` es la fuente
 *     de verdad y filtra el evento en todos los canales.
 *  2. Telegram requiere `telegramEnabled` + `telegramChatId` + `TelegramDeviceConfig`
 *     habilitado y que el evento supere su `minSeverity` y su mapa de tipos `alertOn*`.
 *  3. Email requiere `emailAlerts` + proveedor configurado + email del usuario.
 *  4. Webhook requiere `webhookUrl`.
 *
 * @param {{ event: { severity: string, type: string }, ownerPrefs: { minAlertSeverity?: string, telegramEnabled?: boolean, telegramChatId?: string|null, emailAlerts?: boolean, webhookUrl?: string|null }, telegramDeviceConfig: ({ enabled: boolean, minSeverity?: string, alertOnFault?: boolean, alertOnRange?: boolean, alertOnDisconnect?: boolean, alertOnSystem?: boolean })|null, userEmail?: string|null, emailConfigured?: boolean }} input Contexto resuelto por el orquestador.
 * @returns {Array<{ channel: 'telegram', chatId: string }|{ channel: 'email', to: string }|{ channel: 'webhook', url: string }>} Delivery Plan ordenado por canal.
 */
export function buildDistributionPlan({ event, ownerPrefs, telegramDeviceConfig, userEmail, emailConfigured }) {
  const plan = [];

  const alarmSev = SEVERITY_ORDER[event?.severity] ?? SEVERITY_ORDER.LOW;
  const minSev = USER_SEVERITY_RANK[ownerPrefs?.minAlertSeverity] ?? SEVERITY_ORDER.MEDIUM;
  if (alarmSev < minSev) return plan;

  // Telegram
  if (ownerPrefs?.telegramEnabled && ownerPrefs?.telegramChatId && telegramDeviceConfig?.enabled) {
    const deviceMinSev = SEVERITY_ORDER[telegramDeviceConfig.minSeverity] ?? SEVERITY_ORDER.MEDIUM;
    const typeFlag = TELEGRAM_TYPE_FLAG[event?.type];
    const typeAllowed = typeFlag ? telegramDeviceConfig[typeFlag] !== false : true;

    if (alarmSev >= deviceMinSev && typeAllowed) {
      plan.push({ channel: 'telegram', chatId: ownerPrefs.telegramChatId });
    }
  }

  // Email
  if (ownerPrefs?.emailAlerts && emailConfigured && userEmail) {
    plan.push({ channel: 'email', to: userEmail });
  }

  // Webhook
  if (ownerPrefs?.webhookUrl) {
    plan.push({ channel: 'webhook', url: ownerPrefs.webhookUrl });
  }

  return plan;
}
