import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import MQTTProvisioningService from './mqttProvisioningService.js';
import { createChildLogger } from '../config/pino.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);
const log = createChildLogger('MQTT_PROV');

// Debounce de la recarga: N registros rápidos coalescen en un único SIGHUP
// (recarga idempotente en job, sin reinicio del contenedor — ISSUE-001 / PR-E).
const RELOAD_DEBOUNCE_MS = 500;

// ── Hash Mosquitto $7$ (sha512-pbkdf2) — ISSUE-024 ─────────────────
// Reimplementado en Node para NUNCA pasar la contraseña en el argv de un
// subproceso: provisionDevice/revokeDevice escriben la línea user:<hash>
// directamente en password_file, sin invocar `mosquitto_passwd -b`.
//
// Formato (verificado byte-a-byte contra `mosquitto_passwd` real, 2026-08-11):
//   $7$<iteraciones>$<base64(salt 64B)>$<base64(pbkdf2-sha512 dkLen 64B)>
// El broker Mosquitto 2.x lee el conteo de iteraciones desde el propio hash,
// por lo que cualquier conteo válido se verifica correctamente.
const MOSQUITTO_ITERATIONS = 1000;
const MOSQUITTO_SALT_LEN = 64;
const MOSQUITTO_DKLEN = 64;

/**
 * Genera un hash de contraseña compatible con el password_file de Mosquitto.
 * @param {string} password - Contraseña en claro (nunca va a argv/disco).
 * @returns {string} Hash `$7$<iteraciones>$<salt>$<hash>`.
 */
export function mosquittoPasswordHash(password) {
  const salt = randomBytes(MOSQUITTO_SALT_LEN);
  const hash = pbkdf2Sync(password, salt, MOSQUITTO_ITERATIONS, MOSQUITTO_DKLEN, 'sha512');
  return `$7$${MOSQUITTO_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verifica una contraseña contra un hash `$7$` almacenado.
 * @param {string} password - Contraseña a comprobar.
 * @param {string} storedHash - Hash completo tipo `$7$...$...`.
 * @returns {boolean}
 */
export function verifyMosquittoHash(password, storedHash) {
  const parts = typeof storedHash === 'string' ? storedHash.split('$') : [];
  if (parts.length !== 5 || parts[1] !== '7') return false;
  const iterations = parseInt(parts[2], 10);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[3], 'base64');
    expected = Buffer.from(parts[4], 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const derived = pbkdf2Sync(password, salt, iterations, expected.length, 'sha512');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * MosquittoProvisioningService
 *
 * Manages Mosquitto's password_file and reloads the broker via SIGHUP
 * (idempotente: Mosquitto 2.x recarga password_file y acl_file con SIGHUP,
 * sin downtime). Este es el impl concreto de MQTTProvisioningService para la
 * infraestructura Mosquitto actual.
 *
 * Desde ISSUE-024/PR-L las credenciales se escriben con hash nativo Node
 * (sin subproceso → sin contraseñas en argv); el único subproceso restante
 * es el SIGHUP al contenedor en reload().
 *
 * To migrate to a different broker or auth plugin, create a new class
 * implementing MQTTProvisioningService and swap it in server.js.
 */
export default class MosquittoProvisioningService extends MQTTProvisioningService {
  constructor({ passwordFile, mosquittoContainer } = {}) {
    super();
    this.passwordFile = passwordFile
      || env.MQTT_PROVISIONING.passwordFile
      || '';

    this.container = mosquittoContainer
      || env.MQTT_PROVISIONING.container
      || 'mush2-mosquitto';

    this.reloadTimer = null;
    // Serializa los read-modify-write de password_file (provisioning
    // concurrente sin carreras).
    this.writeQueue = Promise.resolve();
  }

  async provisionDevice(deviceId, mqttUser, mqttPass) {
    try {
      if (!existsSync(this.passwordFile)) {
        log.error({ event: 'PASSWORD_FILE_MISSING', path: this.passwordFile }, 'password_file not found');
        return { ok: false, error: `password_file not found at ${this.passwordFile}` };
      }

      const hashed = mosquittoPasswordHash(mqttPass);
      await this.enqueueWrite((lines) => {
        const withoutUser = lines.filter((l) => l.length > 0 && !l.startsWith(`${mqttUser}:`));
        return [...withoutUser, `${mqttUser}:${hashed}`];
      });

      log.info({ event: 'USER_PROVISIONED', user: mqttUser, deviceId }, `MQTT user provisioned for ${deviceId}`);
      return { ok: true };
    } catch (err) {
      log.error({ event: 'PROVISION_ERROR', error: err.message, deviceId }, 'Failed to provision MQTT user');
      return { ok: false, error: err.message };
    }
  }

  async revokeDevice(deviceId, mqttUser) {
    try {
      if (!existsSync(this.passwordFile)) {
        return { ok: false, error: `password_file not found at ${this.passwordFile}` };
      }

      await this.enqueueWrite((lines) =>
        lines.filter((l) => l.length > 0 && !l.startsWith(`${mqttUser}:`)));

      log.info({ event: 'USER_REVOKED', user: mqttUser, deviceId }, `MQTT user revoked for ${deviceId}`);
      return { ok: true };
    } catch (err) {
      log.error({ event: 'REVOKE_ERROR', error: err.message, deviceId }, 'Failed to revoke MQTT user');
      return { ok: false, error: err.message };
    }
  }

  /**
   * Read-modify-write serializado del password_file. `mutate` recibe las
   * líneas actuales (sin líneas vacías) y devuelve las nuevas.
   */
  enqueueWrite(mutate) {
    const run = async () => {
      const content = await readFile(this.passwordFile, 'utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const next = mutate(lines);
      await writeFile(this.passwordFile, `${next.join('\n')}\n`, 'utf-8');
    };
    const task = this.writeQueue.then(run, run);
    this.writeQueue = task.catch(() => {});
    return task;
  }

  async reload() {
    try {
      // Mosquitto corre como PID 1 en eclipse-mosquitto:2; docker kill envía
      // SIGHUP al proceso principal, que recarga password_file y acl_file
      // sin reiniciar el broker (idempotente, sin downtime).
      const { stdout, stderr } = await execFileAsync(
        'docker', ['kill', '--signal', 'HUP', this.container],
        { timeout: 10000 },
      );

      log.info({ event: 'BROKER_RELOADED', container: this.container }, 'Mosquitto config reloaded (SIGHUP)');
      return { ok: true };
    } catch (err) {
      log.error({ event: 'RELOAD_ERROR', error: err.message }, 'Failed to reload Mosquitto config');
      return { ok: false, error: err.message };
    }
  }

  /**
   * Recarga programada (job con debounce): múltiples provisioning rápidos
   * coalescen en una única señal SIGHUP.
   */
  scheduleReload() {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = setTimeout(async () => {
      this.reloadTimer = null;
      await this.reload();
    }, RELOAD_DEBOUNCE_MS);
    return { ok: true, scheduled: true };
  }
}
