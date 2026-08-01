// Constructor de status conforme al contrato (status.schema.json).
//
// Estado publicado en mush2/{deviceId}/status: 'online'/'offline' (retained)
// y estados de la FSM. ts en segundos (ADR-026).
//
// AISLAMIENTO DEL PROTOCOLO: módulo puro, candidato a migrar a packages/protocol.

export const STATUS_STATES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BOOT: 'BOOT',
  INIT: 'INIT',
  WIFI: 'WIFI',
  NORMAL: 'NORMAL',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
  RECOVERY: 'RECOVERY',
  SAFE: 'SAFE',
  OTA_UPDATING: 'OTA_UPDATING',
  PROVISIONING: 'PROVISIONING',
  UNKNOWN: 'UNKNOWN',
};

export function buildStatus({ state, mode = '', rssi = -55, mac = '', fwVer = '', hwRev = '', ts }) {
  if (!Number.isInteger(ts) || ts <= 0) {
    ts = Math.floor(Date.now() / 1000);
  }
  const payload = { state, ts };
  if (mode) payload.mode = mode;
  if (rssi !== null && rssi !== undefined) payload.rssi = rssi;
  if (mac) payload.mac = mac;
  if (fwVer) payload.fwVer = fwVer;
  if (hwRev) payload.hwRev = hwRev;
  return payload;
}
