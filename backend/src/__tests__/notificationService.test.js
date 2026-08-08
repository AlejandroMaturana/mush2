import { jest } from '@jest/globals';

const mockFindByPk = jest.fn();
const mockPrefFindOne = jest.fn();
const mockTelegramDeviceConfigFindOne = jest.fn();
const mockUserFindByPk = jest.fn();
const mockSendAlarm = jest.fn();
const mockSendEmail = jest.fn();
const mockIsEmailConfigured = jest.fn();
const mockSendWebhook = jest.fn();
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  Device: { findByPk: mockFindByPk },
  UserPreference: { findOne: mockPrefFindOne },
  User: { findByPk: mockUserFindByPk },
  TelegramDeviceConfig: { findOne: mockTelegramDeviceConfigFindOne },
}));

jest.unstable_mockModule('../services/telegramBotService.js', () => ({
  sendAlarm: mockSendAlarm,
}));

jest.unstable_mockModule('../services/notifications/emailProvider.js', () => ({
  sendEmail: mockSendEmail,
  isEmailConfigured: mockIsEmailConfigured,
}));

jest.unstable_mockModule('../services/notifications/webhookProvider.js', () => ({
  sendWebhook: mockSendWebhook,
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: mockLogInfo, error: mockLogError }),
  default: {},
}));

const { notifyAlarm } = await import('../services/notifications/notificationService.js');

function makeDevice(overrides = {}) {
  return {
    id: 1,
    userId: 'user-1',
    deviceId: 'dev-001',
    chamberName: 'Cámara A',
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

function makeAlarm(severity, overrides = {}) {
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

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindByPk.mockResolvedValue(makeDevice());
    mockPrefFindOne.mockResolvedValue(makePrefs());
    mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig());
    mockUserFindByPk.mockResolvedValue({ email: 'owner@example.com' });
    mockSendAlarm.mockResolvedValue();
    mockSendEmail.mockResolvedValue();
    mockSendWebhook.mockResolvedValue();
    mockIsEmailConfigured.mockReturnValue(true);
  });

  describe('severity gate (ISSUE-041)', () => {
    const telegramPrefs = (severity) =>
      makePrefs({ minAlertSeverity: severity, telegramEnabled: true, telegramChatId: '123' });

    it('delivers LOW alarm when minAlertSeverity is "info"', async () => {
      mockPrefFindOne.mockResolvedValue(telegramPrefs('info'));
      mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig({ minSeverity: 'LOW' }));
      const alarm = makeAlarm('LOW');

      await notifyAlarm(alarm);

      expect(mockSendAlarm).toHaveBeenCalledWith('123', alarm, makeDevice());
    });

    it('blocks LOW alarm when minAlertSeverity is "warning" (default)', async () => {
      const alarm = makeAlarm('LOW');

      await notifyAlarm(alarm);

      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('delivers MEDIUM alarm when minAlertSeverity is "warning"', async () => {
      mockPrefFindOne.mockResolvedValue(telegramPrefs('warning'));
      const alarm = makeAlarm('MEDIUM');

      await notifyAlarm(alarm);

      expect(mockSendAlarm).toHaveBeenCalledWith('123', alarm, makeDevice());
    });

    it('blocks MEDIUM alarm when minAlertSeverity is "critical"', async () => {
      mockPrefFindOne.mockResolvedValue(telegramPrefs('critical'));
      const alarm = makeAlarm('MEDIUM');

      await notifyAlarm(alarm);

      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('delivers CRITICAL alarm when minAlertSeverity is "critical"', async () => {
      mockPrefFindOne.mockResolvedValue(telegramPrefs('critical'));
      const alarm = makeAlarm('CRITICAL');

      await notifyAlarm(alarm);

      expect(mockSendAlarm).toHaveBeenCalledWith('123', alarm, makeDevice());
    });

    it('falls back to warning (MEDIUM) threshold for unknown severity value', async () => {
      mockPrefFindOne.mockResolvedValue(telegramPrefs('bogus'));

      await notifyAlarm(makeAlarm('LOW'));
      expect(mockSendAlarm).not.toHaveBeenCalled();

      await notifyAlarm(makeAlarm('MEDIUM'));
      expect(mockSendAlarm).toHaveBeenCalledTimes(1);
    });

    it('applies the same global gate to every channel', async () => {
      mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig({ minSeverity: 'LOW' }));
      mockPrefFindOne.mockResolvedValue(
        makePrefs({ minAlertSeverity: 'info', telegramEnabled: true, telegramChatId: '123', emailAlerts: true, webhookUrl: 'https://hooks.example.com' }),
      );

      await notifyAlarm(makeAlarm('LOW'));

      expect(mockSendAlarm).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendWebhook).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      mockFindByPk.mockResolvedValue(makeDevice());
      mockPrefFindOne.mockResolvedValue(
        makePrefs({ minAlertSeverity: 'warning', telegramEnabled: true, telegramChatId: '123', emailAlerts: true, webhookUrl: 'https://hooks.example.com' }),
      );
      mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig());
      mockIsEmailConfigured.mockReturnValue(true);

      await notifyAlarm(makeAlarm('LOW'));

      expect(mockSendAlarm).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendWebhook).not.toHaveBeenCalled();
    });
  });

  describe('early returns', () => {
    it('does nothing when alarm is missing', async () => {
      await notifyAlarm(null);
      expect(mockFindByPk).not.toHaveBeenCalled();
    });

    it('does nothing when alarm has no deviceId', async () => {
      await notifyAlarm(makeAlarm('CRITICAL', { deviceId: null }));
      expect(mockFindByPk).not.toHaveBeenCalled();
    });

    it('does nothing when device is not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await notifyAlarm(makeAlarm('CRITICAL'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('does nothing when device has no owner', async () => {
      mockFindByPk.mockResolvedValue(makeDevice({ userId: null }));
      await notifyAlarm(makeAlarm('CRITICAL'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('does nothing when owner preferences are missing', async () => {
      mockPrefFindOne.mockResolvedValue(null);
      await notifyAlarm(makeAlarm('CRITICAL'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });
  });

  describe('channel routing', () => {
    it('sends via Telegram when telegramEnabled, chatId set and device config passes', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ telegramEnabled: true, telegramChatId: '123' }));
      const alarm = makeAlarm('HIGH');

      await notifyAlarm(alarm);

      expect(mockTelegramDeviceConfigFindOne).toHaveBeenCalledWith({ where: { deviceId: 1 } });
      expect(mockSendAlarm).toHaveBeenCalledWith('123', alarm, makeDevice());
    });

    it('skips Telegram when telegramEnabled but no chatId', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ telegramEnabled: true }));
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockTelegramDeviceConfigFindOne).not.toHaveBeenCalled();
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('skips Telegram when device config is missing', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ telegramEnabled: true, telegramChatId: '123' }));
      mockTelegramDeviceConfigFindOne.mockResolvedValue(null);
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('skips Telegram when device config is disabled', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ telegramEnabled: true, telegramChatId: '123' }));
      mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig({ enabled: false }));
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('skips Telegram when alarm severity is below device minSeverity', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ minAlertSeverity: 'info', telegramEnabled: true, telegramChatId: '123' }));
      mockTelegramDeviceConfigFindOne.mockResolvedValue(makeDeviceConfig({ minSeverity: 'HIGH' }));
      await notifyAlarm(makeAlarm('LOW'));
      expect(mockSendAlarm).not.toHaveBeenCalled();
    });

    it('sends via Email when emailAlerts and email configured and user has email', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ emailAlerts: true }));

      await notifyAlarm(makeAlarm('HIGH'));

      expect(mockUserFindByPk).toHaveBeenCalledWith('user-1', { attributes: ['email'] });
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailCall = mockSendEmail.mock.calls[0][0];
      expect(emailCall.to).toBe('owner@example.com');
      expect(emailCall.subject).toContain('HIGH');
    });

    it('skips Email when emailAlerts is off', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ emailAlerts: false }));
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockUserFindByPk).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('skips Email when provider is not configured', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ emailAlerts: true }));
      mockIsEmailConfigured.mockReturnValue(false);
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('skips Email when user has no email address', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ emailAlerts: true }));
      mockUserFindByPk.mockResolvedValue({ email: null });
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('sends via Webhook when webhookUrl set', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ webhookUrl: 'https://hooks.example.com' }));
      await notifyAlarm(makeAlarm('HIGH'));

      expect(mockSendWebhook).toHaveBeenCalledTimes(1);
      const webhookCall = mockSendWebhook.mock.calls[0][0];
      expect(webhookCall.url).toBe('https://hooks.example.com');
      expect(webhookCall.payload.alarm.severity).toBe('HIGH');
      expect(webhookCall.payload.device.deviceId).toBe('dev-001');
    });

    it('skips Webhook when no url', async () => {
      await notifyAlarm(makeAlarm('HIGH'));
      expect(mockSendWebhook).not.toHaveBeenCalled();
    });

    it('logs and continues when a channel fails', async () => {
      mockPrefFindOne.mockResolvedValue(makePrefs({ telegramEnabled: true, telegramChatId: '123', emailAlerts: true, webhookUrl: 'https://hooks.example.com' }));
      mockSendAlarm.mockRejectedValue(new Error('tg down'));
      mockSendEmail.mockRejectedValue(new Error('smtp down'));
      mockSendWebhook.mockRejectedValue(new Error('http down'));

      await expect(notifyAlarm(makeAlarm('HIGH'))).resolves.toBeUndefined();

      expect(mockLogError).toHaveBeenCalledTimes(3);
      const messages = mockLogError.mock.calls.map((call) => call[0].channel);
      expect(messages).toContain('telegram');
      expect(messages).toContain('email');
      expect(messages).toContain('webhook');
    });

    it('dispatches to all enabled channels in one pass', async () => {
      mockPrefFindOne.mockResolvedValue(
        makePrefs({ telegramEnabled: true, telegramChatId: '123', emailAlerts: true, webhookUrl: 'https://hooks.example.com' }),
      );

      await notifyAlarm(makeAlarm('HIGH'));

      expect(mockSendAlarm).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendWebhook).toHaveBeenCalledTimes(1);
    });
  });
});
