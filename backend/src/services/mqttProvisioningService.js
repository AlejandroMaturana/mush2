/**
 * MQTTProvisioningService — Abstract interface
 *
 * Encapsulates all broker interactions for device credential management.
 * Concrete implementations (Mosquitto, LDAP, DB-backed plugins) must implement
 * these methods. Business logic should ONLY depend on this interface.
 *
 * ADR-028-R01: No module may invoke broker-specific CLI tools directly.
 */

export default class MQTTProvisioningService {
  /**
   * Create or update credentials for a device in the broker.
   * @param {string} deviceId   — device identifier (e.g. "mush2_A0F262E55CBC")
   * @param {string} mqttUser   — MQTT username (e.g. "dev_mush2_A0F262E55CBC")
   * @param {string} mqttPass   — MQTT password (plaintext, 32-char random)
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async provisionDevice(deviceId, mqttUser, mqttPass) {
    throw new Error('MQTTProvisioningService.provisionDevice() not implemented');
  }

  /**
   * Revoke credentials for a device in the broker.
   * @param {string} deviceId
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async revokeDevice(deviceId) {
    throw new Error('MQTTProvisioningService.revokeDevice() not implemented');
  }

  /**
   * Ask the broker to reload credentials (hot-reload if supported).
   * For Mosquitto: restart container or send SIGHUP.
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async reload() {
    throw new Error('MQTTProvisioningService.reload() not implemented');
  }
}
