import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

const SCRIPT_PATH = 'scripts/verify-broker-provisioning.sh';

describe('REG-021: Verificación runtime de provisioning MQTT en contenedor (PR-B/C4, ISSUE-065)', () => {
  const script = readProjectFile(SCRIPT_PATH);

  it('existe el script de verificación hermética', () => {
    expect(script).not.toBe('');
    expect(script.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  describe('Contrato de provisioning que el script verifica en runtime', () => {
    it('usa el hash nativo Node del repo (mosquittoPasswordHash, ISSUE-024)', () => {
      expect(script).toContain('mosquittoProvisioningService.js');
      expect(script).toContain('mosquittoPasswordHash');
    });

    it('codifica SIGHUP como mecanismo de recarga del broker', () => {
      expect(script).toContain('docker kill --signal HUP');
    });

    it('codifica el control negativo: SIN SIGHUP la credencial nueva es rechazada', () => {
      expect(script).toContain('sin SIGHUP');
      expect(script).toContain('RECHAZADA');
    });

    it('codifica TLS obligatorio con cadena verificada (--cafile) y rechazo en claro', () => {
      expect(script).toContain('--cafile');
      expect(script).toContain('sin TLS');
    });

    it('codifica el aislamiento ACL end-to-end por client_id (snooper no recibe)', () => {
      expect(script).toContain('snooper');
      expect(script).toContain('-C 1 -W 6');
    });

    it('codifica la comprobación de .dockerignore sin certs ni password_file', () => {
      expect(script).toContain('docker/mosquitto/certs');
      expect(script).toContain('password_file');
    });

    it('termina con resumen determinista PASS/FAIL que marca el exit code', () => {
      expect(script).toContain('RESULTADO: PASS');
      expect(script).toContain('RESULTADO: FAIL');
      expect(script).toContain('exit 1');
    });
  });

  describe('Hermético — no toca los secretos del repo', () => {
    it('usa un directorio temporal (mktemp -d)', () => {
      expect(script).toContain('mktemp -d');
    });

    it('no redirige escrituras hacia docker/mosquitto (password_file reales)', () => {
      const codeLines = script.split('\n').filter((l) => !l.trim().startsWith('#'));
      expect(codeLines.some((l) => />.*docker\/mosquitto/.test(l))).toBe(false);
    });
  });
});
