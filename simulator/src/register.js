// Registro del dispositivo virtual contra el backend (ADR-028/029).
//
// Flujo idéntico al de un dispositivo físico: POST /api/v1/devices/register →
// el backend provisiona credenciales MQTT (user/pass) en el password_file del
// broker y las devuelve en response.mqtt. El simulador las persiste localmente
// (SIM_CREDENTIALS_FILE) para reutilizarlas en el siguiente arranque y evitar
// reprovisionar.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export function readCredentialsFile(filePath) {
  const full = resolve(filePath);
  if (!existsSync(full)) return null;
  try {
    const data = JSON.parse(readFileSync(full, 'utf-8'));
    if (data && data.user && data.pass) return data;
    return null;
  } catch {
    return null;
  }
}

export function writeCredentialsFile(filePath, creds) {
  const full = resolve(filePath);
  writeFileSync(full, JSON.stringify(creds, null, 2), 'utf-8');
}

export async function registerDevice({ apiUrl, deviceId, firmwareVersion = '0.1.0', hwRevision = 'SIM-1.0', fetchImpl = fetch }) {
  const res = await fetchImpl(`${apiUrl}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, firmwareVersion, hwRevision }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`POST /devices/register falló (${res.status}) ${detail}`.trim());
  }
  const body = await res.json();
  const creds = (body && body.mqtt) || (body && body.data && body.data.mqttUser ? { user: body.data.mqttUser, pass: body.data.mqttPassword } : null);
  if (!creds || !creds.user || !creds.pass) {
    throw new Error(`POST /devices/register no devolvió mqttCredentials para ${deviceId}`);
  }
  return { user: creds.user, pass: creds.pass };
}

// Resuelve credenciales MQTT en orden: env > archivo persistido > registro.
export async function ensureCredentials(config, { fetchImpl = fetch, log = () => {} } = {}) {
  if (config.mqttUsername && config.mqttPassword) {
    return { user: config.mqttUsername, pass: config.mqttPassword, source: 'env' };
  }
  const cached = readCredentialsFile(config.credentialsFile);
  if (cached) {
    return { user: cached.user, pass: cached.pass, source: 'file' };
  }
  log(`Registrando ${config.deviceId} contra ${config.apiUrl} (ADR-028)...`);
  const creds = await registerDevice({ apiUrl: config.apiUrl, deviceId: config.deviceId, fetchImpl });
  writeCredentialsFile(config.credentialsFile, creds);
  log(`Credenciales MQTT de ${config.deviceId} persistidas en ${config.credentialsFile}`);
  return { user: creds.user, pass: creds.pass, source: 'register' };
}
