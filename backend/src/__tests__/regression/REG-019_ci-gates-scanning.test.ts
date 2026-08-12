import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('REG-019: CI Gates & Secrets Scanning (PR-E: I66/I76/I80+I109/I110 + HW_REVISION, cierra I84)', () => {
  const ci = readProjectFile('.github/workflows/ci.yml');
  const rootPkg = readProjectFile('package.json');
  const checklist = readProjectFile('docs/security/secrets-checklist.md');

  describe('I066 — script `test` en raíz (gate monorepo)', () => {
    it('package.json raíz tiene script test que NO es el echo placeholder', () => {
      expect(rootPkg).not.toMatch(/"test"\s*:\s*"echo \\?"Error: no test specified\\?"/);
      expect(rootPkg).toMatch(/"test"\s*:\s*"[^"]*(backend|frontend|workspace|filter)[^"]*"/);
    });
  });

  describe('I080+I109 — tests de frontend en CI', () => {
    it('job frontend del CI ejecuta `pnpm test` (no solo build)', () => {
      const frontendJob = ci.split(/^  frontend:/m)[1] || '';
      expect(frontendJob).toMatch(/pnpm (run )?test/);
      expect(frontendJob).toMatch(/pnpm run build/);
    });
  });

  describe('I076 — gates de audit/scanning/lint en CI', () => {
    it('CI ejecuta pnpm audit (backend+frontend o raíz)', () => {
      expect(ci).toMatch(/pnpm audit/);
    });

    it('CI ejecuta gitleaks en cada PR', () => {
      expect(ci).toMatch(/gitleaks/i);
      expect(ci).toMatch(/pull_request|pull-request/i);
    });

    it('CI declara osv-scanner o alternativo equivalente', () => {
      expect(ci).toMatch(/osv-scanner/i);
    });
  });

  describe('I110 — sketches HW en CI o política explícita', () => {
    const policy = readProjectFile('docs/development/firmware-test-sketches.md');
    const ciIndependent = ['S3_test-actuator-chain', 'S3_test-button', 'S3_test-http-poller', 'S3_test-watchdog'];
    const ciHwOnly = ['S3_test-colorsRGB', 'S3_test-i2c-ENS160-AHT21', 'S3_test-ledRGB', 'S3_test-RGBoff', 'S3_test-SSR-4ch'];

    it('cada sketch autónomo (con plataformio.ini) se compila en CI', () => {
      for (const sketch of ciIndependent) {
        const ini = readProjectFile(`firmware/test/${sketch}/platformio.ini`);
        expect(ini.length, `sketch ${sketch} sin plataformio.ini`).toBeGreaterThan(0);
      }
      expect(ci).toMatch(/S3_test/);
    });

    it('los sketches HW-only están documentados fuera del gate (política explícita)', () => {
      for (const sketch of ciHwOnly) {
        expect(policy.includes(sketch), `sketch ${sketch} no documentado en política`).toBe(true);
      }
      expect(policy).toMatch(/fuera del gate|fuera.*gate|hardware|HW/);
    });

    it('CI compila sketches autónomos (pio run -d)', () => {
      expect(ci).toMatch(/pio run[^\n]*-d/);
      expect(ci).toMatch(/S3_test/);
    });
  });

  describe('Fix HW_REVISION — config.h del CI define la macro (F11-1)', () => {
    it('heredoc de config.h en CI define HW_REVISION o incluye config.example.h', () => {
      expect(ci).toMatch(/HW_REVISION/);
      expect(ci).toMatch(/config\.example\.h|#define HW_REVISION/);
    });
  });

  describe('I84 — cierre: scanning automático activo + checklist actualizado', () => {
    it('checklist de secretos marca scanning automático como activo', () => {
      expect(checklist).toMatch(/Scanning automático/);
      expect(checklist).not.toMatch(/Pendiente \(I076[^)]*\)|Pendiente.*I076/);
    });
  });
});