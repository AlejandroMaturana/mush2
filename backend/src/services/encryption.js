import CryptoJS from 'crypto-js';
import { env } from '../config/env.js';

const KEY = env.JWT_SECRET.padEnd(32, '0').slice(0, 32);

export function encrypt(text) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(KEY), {
    iv,
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.Pkcs7,
  });
  const combined = iv.toString() + ':' + encrypted.toString();
  return combined;
}

export function decrypt(ciphertext) {
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 2) {
      // fallback: try as raw base64 (for unencrypted legacy data)
      return ciphertext;
    }
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const encrypted = parts[1];
    const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(KEY), {
      iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return ciphertext;
  }
}
