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
    DATA_ENC_KEY: 'a-32-byte-key-00000000000000',
    JWT_SECRET: 'ignored',
  },
}));

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
  default: {},
}));

const { getBotConfig, saveBotConfig, isConfigured, maskSecret } = await import('../services/telegramConfigurationService.js');
const { encrypt, decrypt } = await import('../services/encryption.js');

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
    const persistedValue = tokenSetting.update.mock.calls[0][0].value;
    expect(persistedValue.startsWith('enc:v1:')).toBe(true);
    expect(decrypt(persistedValue)).toBe('new-token');
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

describe('TelegramConfigurationService (ISSUE-011) — secrets at rest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saveBotConfig persists the token encrypted', async () => {
    const tokenSetting = { update: jest.fn() };
    const usernameSetting = { update: jest.fn() };
    mockFindOrCreate
      .mockResolvedValueOnce([tokenSetting])
      .mockResolvedValueOnce([usernameSetting]);

    await saveBotConfig({ token: 'tok-123', username: 'MyBot' });

    const persisted = tokenSetting.update.mock.calls[0][0].value;
    expect(persisted.startsWith('enc:v1:')).toBe(true);
    expect(decrypt(persisted)).toBe('tok-123');
  });

  it('getBotConfig decrypts a stored encrypted token', async () => {
    mockFindOne.mockResolvedValueOnce(setting(encrypt('tok-123')));
    mockFindOne.mockResolvedValueOnce(setting('MyBot'));
    const config = await getBotConfig();
    expect(config.storedToken).toBe('tok-123');
    expect(config.token).toBe('tok-123');
    expect(config.tokenConfigured).toBe(true);
  });

  it('getBotConfig handles a legacy plaintext stored token', async () => {
    mockFindOne.mockResolvedValueOnce(setting('legacy-token'));
    mockFindOne.mockResolvedValueOnce(setting('LegacyBot'));
    const config = await getBotConfig();
    expect(config.storedToken).toBe('legacy-token');
    expect(config.token).toBe('legacy-token');
  });
});

describe('maskSecret (ISSUE-011)', () => {
  it('returns empty string for empty values', () => {
    expect(maskSecret('')).toBe('');
    expect(maskSecret(undefined)).toBe('');
  });

  it('masks short values entirely', () => {
    expect(maskSecret('abc')).toBe('••••');
    expect(maskSecret('12345678')).toBe('••••');
  });

  it('keeps first 4 and last 4 chars for longer values', () => {
    expect(maskSecret('123456789012')).toBe('1234••••9012');
  });
});
