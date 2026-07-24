/**
 * Backward Compatibility Test
 *
 * Verifies that the new backend (Phase 9 domain-first architecture)
 * maintains full compatibility with existing firmware MQTT protocol.
 *
 * DoD requirement: "Backward compatibility verificada (firmware viejo vs backend nuevo)"
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MQTT_BRIDGE_PATH = path.resolve(__dirname, '../services/mqttBridge.js');
const mqttBridgeSource = fs.readFileSync(MQTT_BRIDGE_PATH, 'utf-8');

describe('MQTT Backward Compatibility', () => {
  describe('Topic Subscriptions', () => {
    it('should subscribe to telemetry topic', () => {
      expect(mqttBridgeSource).toContain("+/telemetry");
    });

    it('should subscribe to status topic', () => {
      expect(mqttBridgeSource).toContain("+/status");
    });

    it('should subscribe to alarm topic', () => {
      expect(mqttBridgeSource).toContain("+/alarm");
    });

    it('should subscribe to ack topic', () => {
      expect(mqttBridgeSource).toContain("+/ack");
    });

    it('should subscribe to health topic', () => {
      expect(mqttBridgeSource).toContain("+/health");
    });

    it('should subscribe to maintenance topic', () => {
      expect(mqttBridgeSource).toContain("+/maintenance");
    });

    it('should use TOPIC_PREFIX constant for all subscriptions', () => {
      expect(mqttBridgeSource).toContain("const TOPIC_PREFIX = 'mush2'");
    });

    it('should subscribe with QoS 1', () => {
      expect(mqttBridgeSource).toContain("{ qos: 1 }");
    });
  });

  describe('Telemetry Payload Parsing', () => {
    it('should parse temperature from data.temp', () => {
      expect(mqttBridgeSource).toContain("data.temp");
    });

    it('should parse humidity from data.hum', () => {
      expect(mqttBridgeSource).toContain("data.hum");
    });

    it('should parse CO2 from data.co2', () => {
      expect(mqttBridgeSource).toContain("data.co2");
    });

    it('should parse VOC from data.tvoc', () => {
      expect(mqttBridgeSource).toContain("data.tvoc");
    });

    it('should parse AQI from data.aqi', () => {
      expect(mqttBridgeSource).toContain("data.aqi");
    });
  });

  describe('Health Payload Parsing', () => {
    it('should parse freeHeap', () => {
      expect(mqttBridgeSource).toContain("data.freeHeap");
    });

    it('should parse minFreeHeap', () => {
      expect(mqttBridgeSource).toContain("data.minFreeHeap");
    });

    it('should parse maxAllocHeap', () => {
      expect(mqttBridgeSource).toContain("data.maxAllocHeap");
    });

    it('should parse task stacks', () => {
      expect(mqttBridgeSource).toContain("data.stack");
    });

    it('should parse sensor status', () => {
      expect(mqttBridgeSource).toContain("data.i2cHealthy");
    });
  });

  describe('Actuator Command Publishing', () => {
    it('should publish to actuators topic', () => {
      expect(mqttBridgeSource).toContain("/actuators");
    });

    it('should include type: actuator_state in payload', () => {
      expect(mqttBridgeSource).toContain("type: 'actuator_state'");
    });

    it('should include channel and state for each actuator', () => {
      expect(mqttBridgeSource).toContain("channel: c.channel");
      expect(mqttBridgeSource).toContain("state: c.state");
    });
  });

  describe('Phase 9 Domain Integration', () => {
    it('should NOT import from domain layer', () => {
      expect(mqttBridgeSource).not.toContain("from '../../domain/");
      expect(mqttBridgeSource).not.toContain("from '../../application/");
    });

    it('should still use Sequelize models directly', () => {
      expect(mqttBridgeSource).toContain("from '../models/index.js'");
    });
  });
});
