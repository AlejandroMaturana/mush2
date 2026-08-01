// Configuración operativa del simulador. Todo parámetro es configurable por
// variable de entorno (prefijo SIM_); los valores por defecto apuntan al stack
// de desarrollo (mosquitto dev en 1884, backend dev en 3797).

function boolEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

export function loadConfig(env = process.env) {
  const telemetryMode = env.SIM_TELEMETRY_MODE || 'drift';
  const telemetryFixed = (() => {
    if (!env.SIM_TELEMETRY_FIXED) return {};
    try {
      return JSON.parse(env.SIM_TELEMETRY_FIXED);
    } catch {
      throw new Error(`SIM_TELEMETRY_FIXED no es JSON válido: ${env.SIM_TELEMETRY_FIXED}`);
    }
  })();

  return {
    deviceId: env.SIM_DEVICE_ID || 'sim_001',
    brokerUrl: env.SIM_BROKER_URL || 'mqtt://localhost:1884',
    apiUrl: (env.SIM_API_URL || 'http://localhost:3797/api/v1').replace(/\/+$/, ''),
    telemetryIntervalMs: parseInt(env.SIM_TELEMETRY_INTERVAL_MS || '10000', 10),
    telemetryMode: telemetryMode === 'fixed' ? 'fixed' : 'drift',
    telemetryBase: telemetryFixed,
    seed: parseInt(env.SIM_SEED || '12345', 10),
    topicPrefix: env.SIM_TOPIC_PREFIX || 'mush2',
    mqttUsername: env.SIM_MQTT_USER || '',
    mqttPassword: env.SIM_MQTT_PASS || '',
    credentialsFile: env.SIM_CREDENTIALS_FILE || '.sim-credentials.json',
    reconnectPeriod: parseInt(env.SIM_RECONNECT_PERIOD_MS || '5000', 10),
    qos: 1,
    retainStatus: boolEnv('SIM_RETAIN_STATUS', true),
    logLevel: env.SIM_LOG_LEVEL || 'info',
  };
}
