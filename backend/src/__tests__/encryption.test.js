import { jest } from '@jest/globals';
import crypto from 'crypto';

const MOCK_KEY = 'a-32-byte-key-00000000000000';

jest.unstable_mockModule('../config/env.js', () => ({
  env: {
    DATA_ENC_KEY: MOCK_KEY,
    JWT_SECRET: 'ignored',
  },
}));

const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

jest.unstable_mockModule('../config/pino.js', () => ({
  createChildLogger: () => mockLogger,
  default: {},
}));

const { encrypt, decrypt } = await import('../services/encryption.js');

const TEST_KEY = Buffer.from(MOCK_KEY.padEnd(32, '0').slice(0, 32), 'utf8');

describe('encryption.js (ISSUE-020)', () => {
  it('encrypt returns a labeled enc:v1 ciphertext with 5 colon-separated parts', () => {
    const out = encrypt('hola');
    expect(out.startsWith('enc:v1:')).toBe(true);
    expect(out.split(':')).toHaveLength(5);
  });

  it('decrypt round-trips its own ciphertext', () => {
    const secret = 'integration-credentials-payload';
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it('decrypt handles legacy iv:authTag:enc ciphertext (backward compat)', () => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', TEST_KEY, iv);
    let enc = cipher.update('legacy-secret', 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const legacy = `${iv.toString('hex')}:${authTag}:${enc}`;

    expect(decrypt(legacy)).toBe('legacy-secret');
  });

  it('decrypt returns the input for invalid ciphertext (IntegrationCredentials compat)', () => {
    expect(decrypt('texto-invalido')).toBe('texto-invalido');
    expect(decrypt('')).toBe('');
  });

  it('decrypt logs DECRYPT_FAILED and returns input on corrupted ciphertext', () => {
    const tampered = encrypt('hola').slice(0, -4) + 'ffff';
    expect(decrypt(tampered)).toBe(tampered);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'DECRYPT_FAILED', cipherLength: tampered.length }),
      'Decrypt failed'
    );
  });

  it('encrypt produces distinct outputs for the same text (random IV)', () => {
    expect(encrypt('hola')).not.toBe(encrypt('hola'));
  });
});
