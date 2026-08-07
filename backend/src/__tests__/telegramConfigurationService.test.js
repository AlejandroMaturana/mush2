import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockFindOrCreate = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  SystemSetting: {
    findOne: mockFindOne,
    findOrCreate: mockFindOrCreate,
  },
}));

jest.unstable_mockModule('../config/env.js', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'env-token',
    TELEGRAM_BOT_USERNAME: 'EnvBot',
  },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
  default: {},
}));

const { getBotConfig, saveBotConfig, isConfigured } = await import('../services/telegramConfigurationService.js');

function setting(value) {
  return { value };
}

describe('TelegramConfigurationService (ISSUE-048)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no stored settings → env fallback, tokenConfigured true via env', async () => {
    mockFindOne.mockResolvedValue(null);
    const config = await getBotConfig();
    expect(config).toEqual({
      token: 'env-token',
      username: 'EnvBot',
      storedToken: '',
      storedUsername: '',
      tokenConfigured: true,
    });
  });

  it('stored settings win over env fallback', async () => {
    mockFindOne.mockResolvedValueOnce(setting('stored-token'));
    mockFindOne.mockResolvedValueOnce(setting('StoredBot'));
    const config = await getBotConfig();
    expect(config.token).toBe('stored-token');
    expect(config.username).toBe('StoredBot');
    expect(config.tokenConfigured).toBe(true);
  });

  it('empty stored values → env fallback, tokenConfigured reflects persisted-only', async () => {
    mockFindOne.mockResolvedValueOnce(setting(''));
    mockFindOne.mockResolvedValueOnce(setting(''));
    const config = await getBotConfig();
    expect(config.token).toBe('env-token');
    expect(config.username).toBe('EnvBot');
    expect(config.storedToken).toBe('');
    expect(config.tokenConfigured).toBe(true);
  });

  it('saveBotConfig upserts both settings idempotently', async () => {
    const tokenSetting = { update: jest.fn() };
    const usernameSetting = { update: jest.fn() };
    mockFindOrCreate
      .mockResolvedValueOnce([tokenSetting])
      .mockResolvedValueOnce([usernameSetting]);

    const saved = await saveBotConfig({ token: 'new-token', username: 'NewBot' });

    expect(saved).toEqual({ token: 'new-token', username: 'NewBot' });
    expect(mockFindOrCreate).toHaveBeenCalledTimes(2);
    expect(tokenSetting.update).toHaveBeenCalledWith({ value: 'new-token' });
    expect(usernameSetting.update).toHaveBeenCalledWith({ value: 'NewBot' });
  });

  it('saveBotConfig defaults username to empty when not provided', async () => {
    const tokenSetting = { update: jest.fn() };
    const usernameSetting = { update: jest.fn() };
    mockFindOrCreate
      .mockResolvedValueOnce([tokenSetting])
      .mockResolvedValueOnce([usernameSetting]);

    const saved = await saveBotConfig({ token: 't' });
    expect(saved).toEqual({ token: 't', username: '' });
    expect(usernameSetting.update).toHaveBeenCalledWith({ value: '' });
  });

  it('isConfigured reflects effective token existence', async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(isConfigured()).resolves.toBe(true);
  });
});
