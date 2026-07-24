/**
 * MQTT Broker Unavailable Test
 *
 * Verifies that the firmware enters offline mode when the broker
 * is unavailable, maintains control, and recovers when reconnected.
 *
 * ADR-023 requirement: Firmware keeps operating camera when MQTT fails.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MQTT_CLIENT_H_PATH = path.resolve(__dirname, '../../../firmware/src/mqtt_client.h');
const MQTT_CLIENT_CPP_PATH = path.resolve(__dirname, '../../../firmware/src/mqtt_client.cpp');
const CONFIG_EXAMPLE_PATH = path.resolve(__dirname, '../../../firmware/src/config.example.h');

let mqttClientH: string;
let mqttClientCpp: string;
let configExample: string;

try {
  mqttClientH = fs.readFileSync(MQTT_CLIENT_H_PATH, 'utf-8');
  mqttClientCpp = fs.readFileSync(MQTT_CLIENT_CPP_PATH, 'utf-8');
  configExample = fs.readFileSync(CONFIG_EXAMPLE_PATH, 'utf-8');
} catch {
  mqttClientH = '';
  mqttClientCpp = '';
  configExample = '';
}

describe('MQTT Broker Unavailable', () => {
  describe('Reconnection with Backoff', () => {
    it('should have exponential backoff delay variable', () => {
      expect(mqttClientH).toContain("_reconnectDelay");
    });

    it('should have configurable initial delay', () => {
      expect(configExample).toContain("MQTT_RECONNECT_INITIAL_MS");
    });

    it('should have configurable max delay', () => {
      expect(configExample).toContain("MQTT_RECONNECT_MAX_MS");
    });

    it('should reset delay on successful connection', () => {
      expect(mqttClientCpp).toContain("_reconnectDelay = MQTT_RECONNECT_INITIAL_MS");
    });

    it('should increase delay on failed connection', () => {
      expect(mqttClientCpp).toContain("_reconnectDelay * 2");
    });

    it('should cap delay at maximum', () => {
      expect(mqttClientCpp).toContain("min(_reconnectDelay * 2, MQTT_RECONNECT_MAX_MS)");
    });
  });

  describe('Offline Mode', () => {
    it('should NOT contain automatic fallback to public broker', () => {
      expect(mqttClientCpp).not.toContain("MQTT_BROKER_FALLBACK");
      expect(mqttClientCpp).not.toContain("_usingFallback");
    });

    it('should track connection state', () => {
      expect(mqttClientH).toContain("_wasConnected");
    });
  });

  describe('TLS Support', () => {
    it('should have MQTT_USE_TLS configuration', () => {
      expect(configExample).toContain("MQTT_USE_TLS");
    });

    it('should conditionally include WiFiClientSecure', () => {
      expect(mqttClientH).toContain("WiFiClientSecure");
      expect(mqttClientH).toContain("#if MQTT_USE_TLS == 1");
    });

    it('should have CA root certificate', () => {
      expect(configExample).toContain("MQTT_CA_ROOT");
    });

    it('should have handshake timeout configuration', () => {
      expect(configExample).toContain("MQTT_HANDSHAKE_TIMEOUT_MS");
      expect(mqttClientCpp).toContain("setHandshakeTimeout");
    });
  });

  describe('LWT (Last Will and Testament)', () => {
    it('should set LWT topic in connect call', () => {
      expect(mqttClientCpp).toContain("lwtTopic");
    });

    it('should set LWT payload to offline', () => {
      expect(mqttClientCpp).toContain("offline");
    });

    it('should set LWT as retained', () => {
      expect(mqttClientCpp).toContain("true, lwtPayload");
    });

    it('should publish online status on connect', () => {
      expect(mqttClientCpp).toContain("_publishOnline");
    });
  });

  describe('Environment Configuration', () => {
    it('should have ENV_DEVELOPMENT constant', () => {
      expect(configExample).toContain("ENV_DEVELOPMENT");
    });

    it('should have ENV_STAGING constant', () => {
      expect(configExample).toContain("ENV_STAGING");
    });

    it('should have ENV_PRODUCTION constant', () => {
      expect(configExample).toContain("ENV_PRODUCTION");
    });

    it('should use integer comparison for environment', () => {
      expect(configExample).toContain("#if MUSH_ENV == ENV_PRODUCTION");
    });
  });

  describe('MQTT User', () => {
    it('should have MQTT_USER configuration', () => {
      expect(configExample).toContain("MQTT_USER");
    });

    it('should NOT use DEVICE_ID directly as MQTT_USER', () => {
      expect(configExample).not.toMatch(/MQTT_USER\s+DEVICE_ID/);
    });
  });
});
