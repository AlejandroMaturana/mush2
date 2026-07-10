export const SYSTEM_SETTINGS_DEFAULTS = [
  // === Installation ===
  { key: 'app_name', value: 'Mush2', type: 'string', label: 'App Name', category: 'installation', isPublic: true },
  { key: 'app_environment', value: 'production', type: 'string', label: 'Environment', category: 'installation' },
  { key: 'setup_completed', value: 'false', type: 'boolean', label: 'Setup Completed', category: 'installation' },

  // === Timing ===
  { key: 'sensor_read_interval_ms', value: '5000', type: 'number', label: 'Sensor Read Interval (ms)', category: 'timing' },
  { key: 'actuator_write_interval_ms', value: '5000', type: 'number', label: 'Actuator Write Interval (ms)', category: 'timing' },
  { key: 'telemetry_sync_interval_ms', value: '300000', type: 'number', label: 'Telemetry Sync Interval (ms)', category: 'timing' },
  { key: 'alarm_check_interval_ms', value: '10000', type: 'number', label: 'Alarm Check Interval (ms)', category: 'timing' },
  { key: 'dashboard_refresh_ms', value: '5000', type: 'number', label: 'Dashboard Refresh Interval (ms)', category: 'timing', isPublic: true },
  { key: 'session_timeout_minutes', value: '60', type: 'number', label: 'Session Timeout (minutes)', category: 'timing' },

  // === Storage ===
  { key: 'telemetry_retention_days', value: '90', type: 'number', label: 'Telemetry Retention (days)', category: 'storage' },
  { key: 'alarm_retention_days', value: '365', type: 'number', label: 'Alarm Retention (days)', category: 'storage' },
  { key: 'event_retention_days', value: '180', type: 'number', label: 'Event Retention (days)', category: 'storage' },
  { key: 'max_telemetry_rows_per_query', value: '8000', type: 'number', label: 'Max Telemetry Rows per Query', category: 'storage', isPublic: true },

  // === Environment ===
  { key: 'temp_unit', value: 'celsius', type: 'string', label: 'Temperature Unit', category: 'environment', isPublic: true },
  { key: 'pressure_unit', value: 'hpa', type: 'string', label: 'Pressure Unit', category: 'environment', isPublic: true },
  { key: 'co2_unit', value: 'ppm', type: 'string', label: 'CO2 Unit', category: 'environment', isPublic: true },

  // === States ===
  { key: 'default_cycle_status', value: 'PLANNED', type: 'string', label: 'Default Cycle Status', category: 'states' },
  { key: 'offline_threshold_seconds', value: '120', type: 'number', label: 'Offline Threshold (seconds)', category: 'states' },

  // === Alarms ===
  { key: 'alarm_auto_resolve_minutes', value: '0', type: 'number', label: 'Auto-Resolve Alarms After (minutes, 0=disabled)', category: 'alarms' },
  { key: 'max_alarms_per_device', value: '50', type: 'number', label: 'Max Alarms Per Device', category: 'alarms' },

  // === Integration ===
  { key: 'thingspeak_enabled', value: 'true', type: 'boolean', label: 'ThingSpeak Integration Enabled', category: 'integration' },
  { key: 'telegram_bot_token', value: '', type: 'string', label: 'Telegram Bot Token', description: 'Token del bot obtenido de @BotFather en Telegram', category: 'integration' },
  { key: 'telegram_bot_username', value: '', type: 'string', label: 'Telegram Bot Username', description: 'Username del bot (sin @)', category: 'integration' },
  { key: 'telegram_bot_enabled', value: 'false', type: 'boolean', label: 'Telegram Bot Enabled', category: 'integration' },
  { key: 'api_rate_limit_per_minute', value: '60', type: 'number', label: 'API Rate Limit (per minute)', category: 'integration' },
  { key: 'webhook_retry_count', value: '3', type: 'number', label: 'Webhook Retry Count', category: 'integration' },

  // === OTA ===
  { key: 'ota_enabled', value: 'true', type: 'boolean', label: 'OTA Updates Enabled', category: 'ota' },
  { key: 'ota_check_interval_hours', value: '24', type: 'number', label: 'OTA Check Interval (hours)', category: 'ota' },
  { key: 'ota_firmware_url', value: '', type: 'string', label: 'OTA Firmware Base URL', category: 'ota' },
  { key: 'ota_auto_update', value: 'false', type: 'boolean', label: 'OTA Auto Update', category: 'ota' },
];

export async function seedSystemSettings(SystemSetting) {
  for (const s of SYSTEM_SETTINGS_DEFAULTS) {
    await SystemSetting.findOrCreate({
      where: { key: s.key },
      defaults: s,
    });
  }
}
