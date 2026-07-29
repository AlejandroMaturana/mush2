import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import MQTTProvisioningService from './mqttProvisioningService.js';
import { createChildLogger } from '../config/pino.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);
const log = createChildLogger('MQTT_PROV');

/**
 * MosquittoProvisioningService
 *
 * Manages Mosquitto's password_file and reloads the broker by restarting
 * the Docker container. This is the concrete implementation of
 * MQTTProvisioningService for the current Mosquitto-based infrastructure.
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
      const { stdout, stderr } = await execFileAsync(
        'docker', ['restart', this.container],
        { timeout: 30000 },
      );

      log.info({ event: 'BROKER_RESTARTED', container: this.container }, 'Mosquitto container restarted');
      return { ok: true };
    } catch (err) {
      log.error({ event: 'RESTART_ERROR', error: err.message }, 'Failed to restart Mosquitto container');
      return { ok: false, error: err.message };
    }
  }
}
