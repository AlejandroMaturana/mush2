import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import MQTTProvisioningService from './mqttProvisioningService.js';
import { createChildLogger } from '../config/pino.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);
const log = createChildLogger('MQTT_PROV');

// Debounce de la recarga: N registros rápidos coalescen en un único SIGHUP
// (recarga idempotente en job, sin reinicio del contenedor — ISSUE-001 / PR-E).
const RELOAD_DEBOUNCE_MS = 500;

/**
 * MosquittoProvisioningService
 *
 * Manages Mosquitto's password_file and reloads the broker via SIGHUP
 * (idempotente: Mosquitto 2.x recarga password_file y acl_file con SIGHUP,
 * sin downtime). Este es el impl concreto de MQTTProvisioningService para la
 * infraestructura Mosquitto actual.
 *
 * To migrate to a different broker or auth plugin, create a new class
 * implementing MQTTProvisioningService and swap it in server.js.
 */
export default class MosquittoProvisioningService extends MQTTProvisioningService {
  constructor({ passwordFile, mosquittoContainer, mosquittoPasswdPath } = {}) {
    super();
    this.passwordFile = passwordFile
      || env.MQTT_PROVISIONING.passwordFile
      || '';

    this.container = mosquittoContainer
      || env.MQTT_PROVISIONING.container
      || 'mush2-mosquitto';

    this.mosquittoPasswd = mosquittoPasswdPath
      || env.MQTT_PROVISIONING.mosquittoPasswd
      || 'mosquitto_passwd';

    this.reloadTimer = null;
  }

  async provisionDevice(deviceId, mqttUser, mqttPass) {
    try {
      if (!existsSync(this.passwordFile)) {
        log.error({ event: 'PASSWORD_FILE_MISSING', path: this.passwordFile }, 'password_file not found');
        return { ok: false, error: `password_file not found at ${this.passwordFile}` };
      }

      const { stdout, stderr } = await execFileAsync(
        this.mosquittoPasswd,
        ['-b', this.passwordFile, mqttUser, mqttPass],
        { timeout: 10000 },
      );

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

      const { stdout, stderr } = await execFileAsync(
        this.mosquittoPasswd,
        ['-b', '-D', this.passwordFile, mqttUser],
        { timeout: 10000 },
      );

      log.info({ event: 'USER_REVOKED', user: mqttUser, deviceId }, `MQTT user revoked for ${deviceId}`);
      return { ok: true };
    } catch (err) {
      log.error({ event: 'REVOKE_ERROR', error: err.message, deviceId }, 'Failed to revoke MQTT user');
      return { ok: false, error: err.message };
    }
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
