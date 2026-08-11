import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import MosquittoProvisioningService, {
  mosquittoPasswordHash,
  verifyMosquittoHash,
} from '../../services/mosquittoProvisioningService.js';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// Vector golden generado con mosquitto_passwd real (2026-08-11):
//   mosquitto_passwd -c -b <pf> vector_user 'Golden_Vector_Pass_2026!'
// Confirma que la reimplementación Node produce exactamente el mismo
// formato ($7$<iteraciones>$<salt64>$<pbkdf2-sha512-64>) que el binario.
const GOLDEN_VECTOR =
  '$7$1000$NiXlD2uxpzwYN/oW9oHnTziIRWfTnIp60lo8xzjbLlYUm1nuvlJPsv1HQ4FkrgfcR+goaESaxVj1bPf13hdGzA==$9yK3aysj/+7GCw+ex8JZprBtvzr9LXoiagC+N6ADy68tjU/kj17SCJCXi2esM7C9U2s9CQb/nUDRtd5xsSgJdQ==';

const tmpPath = join(tmpdir(), `mush2_reg015_pf_${Date.now()}`);

describe('REG-015: MQTT provisioning sin credenciales en argv (I24)', () => {
  const serviceSource = readProjectFile('backend/src/services/mosquittoProvisioningService.js');

  describe('sin argv: no se interpola la contraseña en subprocesos', () => {
    it('el servicio NO invoca mosquitto_passwd -b con la contraseña', () => {
      expect(serviceSource).not.toContain("'-b'");
    });

    it('el servicio NO pasa mqttPass a execFile', () => {
      expect(serviceSource).not.toMatch(/execFile[\s\S]{0,160}mqttPass/);
    });

    it('el servicio usa mosquittoPasswordHash (hash nativo Node)', () => {
      expect(serviceSource).toContain('mosquittoPasswordHash');
    });
  });

  describe('hash $7$ nativo compatible con mosquitto', () => {
    it('verifica el vector golden generado por mosquitto_passwd real', () => {
      expect(verifyMosquittoHash('Golden_Vector_Pass_2026!', GOLDEN_VECTOR)).toBe(true);
      expect(verifyMosquittoHash('wrong_password', GOLDEN_VECTOR)).toBe(false);
    });

    it('round-trip: hash generado se verifica y rechaza contraseñas distintas', () => {
      const h = mosquittoPasswordHash('s3cr3t_Pass_2026!');
      expect(verifyMosquittoHash('s3cr3t_Pass_2026!', h)).toBe(true);
      expect(verifyMosquittoHash('otra_pass', h)).toBe(false);
    });

    it('formato $7$<iteraciones>$<salt64>$<hash64> con salt y dkLen de 64 bytes', () => {
      const h = mosquittoPasswordHash('x');
      const parts = h.split('$');
      expect(parts[0]).toBe('');
      expect(parts[1]).toBe('7');
      expect(parts[2]).toBe('1000');
      expect(Buffer.from(parts[3], 'base64').length).toBe(64);
      expect(Buffer.from(parts[4], 'base64').length).toBe(64);
    });
  });

  describe('provisionDevice/revokeDevice sobre password_file (sin subproceso)', () => {
    beforeAll(() => {
      writeFileSync(tmpPath, '# test password_file\n', 'utf-8');
    });

    afterAll(() => {
      rmSync(tmpPath, { force: true });
    });

    it('provisionDevice escribe user:$7$ verificable en el archivo', async () => {
      const svc = new MosquittoProvisioningService({ passwordFile: tmpPath });
      const res = await svc.provisionDevice('dev_tls_1', 'dev_dev_tls_1', 'P@ssword_2026!');
      expect(res.ok).toBe(true);
      const content = readFileSync(tmpPath, 'utf-8');
      const line = content.split(/\r?\n/).find((l) => l.startsWith('dev_dev_tls_1:'));
      expect(line).toBeDefined();
      expect(line!).toContain('$7$');
      const stored = line!.split(':').slice(1).join(':');
      expect(verifyMosquittoHash('P@ssword_2026!', stored)).toBe(true);
    });

    it('provisionDevice es idempotente (upsert: una sola línea por usuario)', async () => {
      const svc = new MosquittoProvisioningService({ passwordFile: tmpPath });
      await svc.provisionDevice('dev_tls_1', 'dev_dev_tls_1', 'Nuevo_Pass_2026!');
      const content = readFileSync(tmpPath, 'utf-8');
      const lines = content.split(/\r?\n/).filter((l) => l.startsWith('dev_dev_tls_1:'));
      expect(lines.length).toBe(1);
      const stored = lines[0].split(':').slice(1).join(':');
      expect(verifyMosquittoHash('Nuevo_Pass_2026!', stored)).toBe(true);
      expect(verifyMosquittoHash('P@ssword_2026!', stored)).toBe(false);
    });

    it('revokeDevice elimina la línea del usuario', async () => {
      const svc = new MosquittoProvisioningService({ passwordFile: tmpPath });
      await svc.provisionDevice('dev_tls_2', 'dev_dev_tls_2', 'Otra_Pass_2026!');
      const res = await svc.revokeDevice('dev_tls_2', 'dev_dev_tls_2');
      expect(res.ok).toBe(true);
      const content = readFileSync(tmpPath, 'utf-8');
      expect(content).not.toContain('dev_dev_tls_2:');
    });

    it('provisionDevice falla controlado si el password_file no existe', async () => {
      const missing = join(tmpdir(), `mush2_reg015_missing_${Date.now()}`);
      const svc = new MosquittoProvisioningService({ passwordFile: missing });
      const res = await svc.provisionDevice('d', 'dev_d', 'pass');
      expect(res.ok).toBe(false);
      expect(res.error).toContain('password_file not found');
    });
  });
});
