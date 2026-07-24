/**
 * MQTT Secure Connection Test
 *
 * Verifies that the backend MQTT bridge uses authentication
 * and connects to a single broker (no automatic fallback).
 *
 * ADR-023 requirement: Secure MQTT Infrastructure
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MQTT_BRIDGE_PATH = path.resolve(__dirname, '../services/mqttBridge.js');
const mqttBridgeSource = fs.readFileSync(MQTT_BRIDGE_PATH, 'utf-8');

describe('MQTT Secure Connection', () => {
  describe('Single Broker Configuration', () => {
    it('should use single broker object (no BROKERS array)', () => {
      expect(mqttBridgeSource).toContain("const broker = {");
      expect(mqttBridgeSource).not.toContain("const BROKERS = [");
    });

    it('should read MQTT_BROKER_URL from environment', () => {
      expect(mqttBridgeSource).toContain("process.env.MQTT_BROKER_URL");
    });

    it('should read MQTT_BROKER_USER from environment', () => {
      expect(mqttBridgeSource).toContain("process.env.MQTT_BROKER_USER");
    });

    it('should read MQTT_BROKER_PASS from environment', () => {
      expect(mqttBridgeSource).toContain("process.env.MQTT_BROKER_PASS");
    });
  });

  describe('Authentication', () => {
    it('should pass username to mqtt.connect', () => {
      expect(mqttBridgeSource).toContain("username: broker.username");
    });

    it('should pass password to mqtt.connect', () => {
      expect(mqttBridgeSource).toContain("password: broker.password");
    });
  });

  describe('No Automatic Fallback', () => {
    it('should NOT contain fallback broker logic', () => {
      expect(mqttBridgeSource).not.toContain("MQTT_BROKER_FALLBACK");
      expect(mqttBridgeSource).not.toContain("fallbackClient");
    });

    it('should NOT contain primaryClient/fallbackClient pattern', () => {
      expect(mqttBridgeSource).not.toContain("primaryClient");
    });
  });

  describe('Reconnection', () => {
    it('should have reconnectPeriod configured', () => {
      expect(mqttBridgeSource).toContain("reconnectPeriod:");
    });

    it('should have connectTimeout configured', () => {
      expect(mqttBridgeSource).toContain("connectTimeout:");
    });
  });
});
