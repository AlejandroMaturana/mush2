import crypto from 'crypto';
import { env } from '../config/env.js';
import { createChildLogger } from '../config/pino.js';

const log = createChildLogger('ENCRYPTION');

// ISSUE-020: clave AES dedicada (DATA_ENC_KEY), con fallback a JWT_SECRET para
// compatibilidad con despliegues que aún no han introducido la variable. Rotar
// JWT_SECRET no debe corromper datos cifrados cuando DATA_ENC_KEY está fijada.
const RAW_KEY = env.DATA_ENC_KEY || env.JWT_SECRET || '';
const KEY = Buffer.from(RAW_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext) {
  try {
    if (typeof ciphertext !== 'string' || !ciphertext) {
      return ciphertext;
    }
    const payload = ciphertext.startsWith(PREFIX)
      ? ciphertext.slice(PREFIX.length)
      : ciphertext;
    const parts = payload.split(':');
    if (parts.length !== 3) {
      return ciphertext;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    log.error({
      module: 'ENCRYPTION',
      event: 'DECRYPT_FAILED',
      reason: err.message,
      cipherLength: ciphertext?.length || 0,
    }, 'Decrypt failed');
    return ciphertext;
  }
}
