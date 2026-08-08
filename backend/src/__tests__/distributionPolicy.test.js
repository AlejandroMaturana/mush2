import { describe, it, expect } from '@jest/globals';

import { buildDistributionPlan } from '../services/notifications/distributionPolicy.js';

function makeEvent(severity, overrides = {}) {
  return {
    id: 10,
    deviceId: 1,
    severity,
    type: 'TEMP_HIGH',
    message: 'Temperatura alta',
    sensorType: 'temperature',
    currentValue: 31,
    thresholdMax: 30,
    ...overrides,
  };
}

function makePrefs(overrides = {}) {
  return {
    minAlertSeverity: 'warning',
    telegramEnabled: false,
    telegramChatId: null,
    emailAlerts: false,
    webhookUrl: null,
    ...overrides,
  };
}

function makeDeviceConfig(overrides = {}) {
  return {
    enabled: true,
    alertOnFault: true,
    alertOnRange: true,
    alertOnDisconnect: true,
    alertOnSystem: true,
    minSeverity: 'MEDIUM',
    ...overrides,
  };
}

function planFor({ severity, prefs, deviceConfig, userEmail = null, emailConfigured = false, eventOverrides = {} } = {}) {
  return buildDistributionPlan({
    event: makeEvent(severity, eventOverrides),
    ownerPrefs: makePrefs(prefs),
    telegramDeviceConfig: deviceConfig === undefined ? makeDeviceConfig() : deviceConfig,
    userEmail,
    emailConfigured,
  });
}

describe('DistributionPolicy', () => {
  describe('global severity gate (ISSUE-041)', () => {
    it('blocks LOW alarm when minAlertSeverity is "warning" (default)', () => {
      const plan = planFor({ severity: 'LOW', prefs: { telegramEnabled: true, telegramChatId: '123' } });
      expect(plan).toEqual([]);
    });

    it('delivers LOW alarm when minAlertSeverity is "info"', () => {
      const plan = planFor({
        severity: 'LOW',
        prefs: { minAlertSeverity: 'info', telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig({ minSeverity: 'LOW' }),
      });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('delivers MEDIUM alarm when minAlertSeverity is "warning"', () => {
      const plan = planFor({ severity: 'MEDIUM', prefs: { telegramEnabled: true, telegramChatId: '123' } });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('blocks MEDIUM alarm when minAlertSeverity is "critical"', () => {
      const plan = planFor({ severity: 'MEDIUM', prefs: { minAlertSeverity: 'critical', telegramEnabled: true, telegramChatId: '123' } });
      expect(plan).toEqual([]);
    });

    it('delivers CRITICAL alarm when minAlertSeverity is "critical"', () => {
      const plan = planFor({ severity: 'CRITICAL', prefs: { minAlertSeverity: 'critical', telegramEnabled: true, telegramChatId: '123' } });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('falls back to warning (MEDIUM) threshold for unknown minAlertSeverity', () => {
      const prefs = { minAlertSeverity: 'bogus', telegramEnabled: true, telegramChatId: '123' };
      expect(planFor({ severity: 'LOW', prefs })).toEqual([]);
      expect(planFor({ severity: 'MEDIUM', prefs })).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('treats unknown severity as LOW (below default gate)', () => {
      const plan = planFor({ severity: 'BOGUS', prefs: { telegramEnabled: true, telegramChatId: '123' } });
      expect(plan).toEqual([]);
    });

    it('applies the same global gate to every channel', () => {
      const prefs = { minAlertSeverity: 'warning', emailAlerts: true, webhookUrl: 'https://hooks.example.com' };
      expect(planFor({ severity: 'LOW', prefs, emailConfigured: true, userEmail: 'a@b.c' })).toEqual([]);

      const plan = planFor({ severity: 'HIGH', prefs, emailConfigured: true, userEmail: 'a@b.c' });
      expect(plan).toEqual([
        { channel: 'email', to: 'a@b.c' },
        { channel: 'webhook', url: 'https://hooks.example.com' },
      ]);
    });
  });

  describe('Telegram channel', () => {
    it('sends when enabled, chatId set and device config passes', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig(),
      });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('skips when telegramEnabled but no chatId', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true },
        deviceConfig: makeDeviceConfig(),
      });
      expect(plan).toEqual([]);
    });

    it('skips when device config is missing', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: null,
      });
      expect(plan).toEqual([]);
    });

    it('skips when device config is disabled', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig({ enabled: false }),
      });
      expect(plan).toEqual([]);
    });

    it('skips when alarm severity is below device minSeverity', () => {
      const plan = planFor({
        severity: 'LOW',
        prefs: { minAlertSeverity: 'info', telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig({ minSeverity: 'HIGH' }),
      });
      expect(plan).toEqual([]);
    });

    it('delivers when alarm severity meets device minSeverity', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { minAlertSeverity: 'info', telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig({ minSeverity: 'HIGH' }),
      });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });

    it('skips when the event type is disabled via alertOn* map', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig({ alertOnFault: false }),
        eventOverrides: { type: 'SENSOR_FAULT' },
      });
      expect(plan).toEqual([]);
    });

    it('maps OUT_OF_RANGE and THRESHOLD_CROSSED to alertOnRange', () => {
      for (const type of ['OUT_OF_RANGE', 'THRESHOLD_CROSSED']) {
        const blocked = planFor({
          severity: 'HIGH',
          prefs: { telegramEnabled: true, telegramChatId: '123' },
          deviceConfig: makeDeviceConfig({ alertOnRange: false }),
          eventOverrides: { type },
        });
        expect(blocked).toEqual([]);

        const allowed = planFor({
          severity: 'HIGH',
          prefs: { telegramEnabled: true, telegramChatId: '123' },
          deviceConfig: makeDeviceConfig({ alertOnRange: true }),
          eventOverrides: { type },
        });
        expect(allowed).toEqual([{ channel: 'telegram', chatId: '123' }]);
      }
    });

    it('passes unknown event types through (no type filter configured)', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123' },
        deviceConfig: makeDeviceConfig(),
        eventOverrides: { type: 'CUSTOM_EVENT' },
      });
      expect(plan).toEqual([{ channel: 'telegram', chatId: '123' }]);
    });
  });

  describe('Email channel', () => {
    it('sends when emailAlerts, provider configured and user has email', () => {
      const plan = planFor({ severity: 'HIGH', prefs: { emailAlerts: true }, emailConfigured: true, userEmail: 'owner@example.com' });
      expect(plan).toEqual([{ channel: 'email', to: 'owner@example.com' }]);
    });

    it('skips when emailAlerts is off', () => {
      const plan = planFor({ severity: 'HIGH', prefs: {}, emailConfigured: true, userEmail: 'owner@example.com' });
      expect(plan).toEqual([]);
    });

    it('skips when provider is not configured', () => {
      const plan = planFor({ severity: 'HIGH', prefs: { emailAlerts: true }, emailConfigured: false, userEmail: 'owner@example.com' });
      expect(plan).toEqual([]);
    });

    it('skips when user has no email', () => {
      const plan = planFor({ severity: 'HIGH', prefs: { emailAlerts: true }, emailConfigured: true, userEmail: null });
      expect(plan).toEqual([]);
    });
  });

  describe('Webhook channel', () => {
    it('sends when webhookUrl set', () => {
      const plan = planFor({ severity: 'HIGH', prefs: { webhookUrl: 'https://hooks.example.com' } });
      expect(plan).toEqual([{ channel: 'webhook', url: 'https://hooks.example.com' }]);
    });

    it('skips when no url', () => {
      const plan = planFor({ severity: 'HIGH', prefs: {} });
      expect(plan).toEqual([]);
    });
  });

  describe('combined plan', () => {
    it('returns telegram, email and webhook in dispatch order', () => {
      const plan = planFor({
        severity: 'HIGH',
        prefs: { telegramEnabled: true, telegramChatId: '123', emailAlerts: true, webhookUrl: 'https://hooks.example.com' },
        deviceConfig: makeDeviceConfig(),
        emailConfigured: true,
        userEmail: 'owner@example.com',
      });
      expect(plan).toEqual([
        { channel: 'telegram', chatId: '123' },
        { channel: 'email', to: 'owner@example.com' },
        { channel: 'webhook', url: 'https://hooks.example.com' },
      ]);
    });

    it('returns empty plan when no channel is enabled', () => {
      const plan = planFor({ severity: 'CRITICAL', prefs: {} });
      expect(plan).toEqual([]);
    });
  });
});
