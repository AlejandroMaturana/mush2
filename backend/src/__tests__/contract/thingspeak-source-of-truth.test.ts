import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const backendRoot = resolve(__dirname, '../../');

function readSource(relativePath: string): string {
  return readFileSync(resolve(backendRoot, relativePath), 'utf-8');
}

describe('ThingSpeak single source of truth (ISSUE-043)', () => {
  describe('models/Device.js', () => {
    const source = readSource('models/Device.js');

    it('no define columnas de claves en claro (readKey/writeKey)', () => {
      expect(source).not.toContain('thingSpeakReadKey');
      expect(source).not.toContain('thingSpeakWriteKey');
    });

    it('conserva la config operacional no secreta', () => {
      expect(source).toContain('thingSpeakEnabled');
      expect(source).toContain('thingSpeakChannelId');
      expect(source).toContain('thingSpeakSyncInterval');
    });
  });

  describe('routes/api.js', () => {
    const source = readSource('routes/api.js');

    it('el PATCH de device no permite actualizar claves en claro', () => {
      expect(source).not.toContain("'thingSpeakReadKey'");
      expect(source).not.toContain("'thingSpeakWriteKey'");
    });

    it('POST /integrations/thingspeak no persiste claves en Device.update', () => {
      const block = source
        .split('\n')
        .filter((line) => line.includes('thingSpeak'))
        .join('\n');
      expect(block).not.toContain('thingSpeakReadKey');
      expect(block).not.toContain('thingSpeakWriteKey');
    });

    it('POST /integrations/thingspeak persiste claves solo via IntegrationCredentials.setCredentials', () => {
      expect(source).toContain('IntegrationCredentials.setCredentials');
    });
  });

  describe('seed.js', () => {
    const source = readSource('seed.js');

    it('no siembra claves en claro en Device', () => {
      expect(source).not.toContain('thingSpeakReadKey');
      expect(source).not.toContain('thingSpeakWriteKey');
    });
  });

  describe('services/thingSpeakSync.js', () => {
    const source = readSource('services/thingSpeakSync.js');

    it('no lee readKey desde columnas de Device (sin precedencia implícita)', () => {
      expect(source).not.toContain('device.thingSpeakReadKey');
      expect(source).not.toContain('thingSpeakWriteKey');
    });

    it('lee readKey desde IntegrationCredentials (fuente cifrada)', () => {
      expect(source).toContain('getDecryptedCredentials');
    });
  });
});
