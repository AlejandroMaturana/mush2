import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// Remove commented lines (mosquitto active config), so we only assert ACTIVE
// directives — a TLS block left commented must fail this test.
function activeLines(conf: string): string[] {
  return conf
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

describe('REG-016: Broker TLS activo y compose sin 1883 público (PR-A: I74/I75/I15)', () => {
  const prodConf = readProjectFile('docker/mosquitto/prod/mosquitto.conf');
  const prodAcl = readProjectFile('docker/mosquitto/prod/acl.conf');
  const compose = readProjectFile('docker-compose.yml');
  const active = activeLines(prodConf);

  describe('I074 — Listener TLS 8883 activo en mosquitto.prod.conf', () => {
    it('define el listener 8883 como directiva activa (no comentada)', () => {
      expect(active).toContain('listener 8883');
    });

    it('referencia cafile/certfile/keyfile activos (certs montados en /mosquitto/certs)', () => {
      expect(active).toContain('cafile /mosquitto/certs/ca.crt');
      expect(active).toContain('certfile /mosquitto/certs/server.crt');
      expect(active).toContain('keyfile /mosquitto/certs/server.key');
    });

    it('desactiva anonymous y no exige certificado de cliente (require_certificate false)', () => {
      expect(active).toContain('allow_anonymous false');
      expect(active).toContain('require_certificate false');
    });

    it('el listener TLS reutiliza password_file y acl_file de producción', () => {
      expect(active).toContain('password_file /mosquitto/config/password_file');
      expect(active).toContain('acl_file /mosquitto/config/acl.conf');
    });
  });

  describe('I075 — docker-compose sin puerto 1883 público', () => {
    it('no publica 1883 al host', () => {
      expect(compose).not.toContain('1883:1883');
    });

    it('publica 8883 (TLS) al host para firmware', () => {
      expect(compose).toContain('8883:8883');
    });

    it('monta los certs como volumen de solo lectura en /mosquitto/certs', () => {
      expect(compose).toContain('/mosquitto/certs:ro');
    });
  });

  describe('I104/I15 — ACL de producción con alarm (cierre de ISSUE-015)', () => {
    it('otorga al bridge lectura de mush2/+/alarm', () => {
      expect(prodAcl).toContain('topic read mush2/+/alarm');
    });

    it('otorga al firmware escritura a mush2/%c/alarm', () => {
      expect(prodAcl).toContain('pattern write mush2/%c/alarm');
    });
  });
});