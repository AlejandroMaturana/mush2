import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '../../../../');

function readProjectFile(relativePath: string): string {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

function componentVersion(dir: string): string {
  const raw = readProjectFile(`${dir}/VERSION`).trim();
  return raw || readProjectFile(`${dir}/package.json`).match(/"version"\s*:\s*"([^"]+)"/)?.[1] || '';
}

describe('REG-022: Release Train D11 (PR-C: I062/I067/I069/I077/I078/I082/I093/I096/I098)', () => {
  const dockerfile = readProjectFile('Dockerfile');
  const compose = readProjectFile('docker-compose.yml');
  const ci = readProjectFile('.github/workflows/ci.yml');
  const releaseWf = readProjectFile('.github/workflows/release.yml');
  const deployment = readProjectFile('docs/operations/deployment.md');
  const readme = readProjectFile('README.md');
  const changelog = readProjectFile('CHANGELOG.md');
  const manifest = JSON.parse(readProjectFile('frontend/public/version-manifest.json'));
  const rootVersion = readProjectFile('package.json').match(/"version"\s*:\s*"([^"]+)"/)?.[1] || '';

  describe('I069 — HEALTHCHECK operativo (Dockerfile + compose)', () => {
    it('Dockerfile define HEALTHCHECK contra /health', () => {
      expect(dockerfile).toMatch(/HEALTHCHECK/);
      expect(dockerfile).toMatch(/\/health/);
    });

    it('compose: backend espera a postgres y mosquitto con service_healthy', () => {
      expect(compose).toMatch(/condition:\s*service_healthy/);
      const backend = compose.split(/^  backend:/m)[1] || '';
      const conditions = backend.match(/condition:\s*service_healthy/g) || [];
      expect(conditions.length).toBeGreaterThanOrEqual(2);
    });

    it('compose: postgres y mosquitto tienen healthcheck', () => {
      expect(compose).toMatch(/pg_isready/);
      expect(compose).toMatch(/nc -z 127\.0\.0\.1 8883/);
    });
  });

  describe('I067 — deploy automático en CI (push a main + health check)', () => {
    const deployJob = ci.split(/^  deploy:/m)[1] || '';

    it('job deploy existe y depende del clúster de gates', () => {
      expect(deployJob).toMatch(/needs:\s*\[firmware, backend, frontend, security\]/);
    });

    it('se dispara solo en push a main con el secret RENDER_DEPLOY_HOOK presente', () => {
      expect(deployJob).toMatch(/refs\/heads\/main/);
      expect(deployJob).toMatch(/RENDER_DEPLOY_HOOK/);
    });

    it('verifica GET /health tras el deploy', () => {
      expect(deployJob).toMatch(/HEALTH_URL/);
      expect(deployJob).toMatch(/health/);
    });
  });

  describe('I078 — validación de version-manifest (script + CI)', () => {
    const checker = readProjectFile('scripts/check-version-manifest.cjs');

    it('existe el script de validación', () => {
      expect(checker.length).toBeGreaterThan(0);
      expect(checker).toMatch(/version-manifest/);
    });

    it('CI ejecuta el check de versiones', () => {
      expect(ci).toMatch(/check-version-manifest\.cjs/);
    });

    it('version-manifest coincide con package.json de cada componente', () => {
      expect(manifest.system.version).toBe(rootVersion);
      expect(manifest.components.backend).toBe(componentVersion('backend'));
      expect(manifest.components.frontend).toBe(componentVersion('frontend'));
      expect(manifest.components.firmware).toBe(componentVersion('firmware'));
      expect(manifest.components.docs).toBe(componentVersion('docs'));
    });
  });

  describe('I082 — release automation (changesets/action)', () => {
    it('existe .github/workflows/release.yml con changesets/action@v1', () => {
      expect(releaseWf).toMatch(/changesets\/action@v1/);
    });

    it('version = pnpm version-packages y publish = node scripts/release.js', () => {
      expect(releaseWf).toMatch(/version:\s*pnpm version-packages/);
      expect(releaseWf).toMatch(/publish:\s*node scripts\/release\.js/);
    });

    it('scripts/release.js crea el tag vX.Y.Z y lo publica', () => {
      const releaseJs = readProjectFile('scripts/release.js');
      expect(releaseJs).toMatch(/git tag -a \$\{tag\}/);
      expect(releaseJs).toMatch(/git push origin \$\{tag\}/);
    });
  });

  describe('I077 + I096 — deployment.md al estado real', () => {
    it('seed real: node src/seed.js (sin src/scripts/seed.js)', () => {
      expect(deployment).toMatch(/node src\/seed\.js/);
      expect(deployment).not.toMatch(/src\/scripts\/seed\.js/);
    });

    it('dev sin nodemon, con node --watch; Node.js 22 y PostgreSQL 16', () => {
      expect(deployment).not.toMatch(/nodemon/);
      expect(deployment).toMatch(/--watch/);
      expect(deployment).toMatch(/Node\.js 22/);
      expect(deployment).toMatch(/PostgreSQL 16/);
    });

    it('broker MQTT ejecutado (no "planificado pero no ejecutado")', () => {
      expect(deployment).not.toMatch(/planificado pero no ejecutado/);
      expect(deployment).toMatch(/verify-broker-provisioning\.sh/);
    });
  });

  describe('I093 — footer README', () => {
    it('footer con v1.8.22 y sin v1.7.22', () => {
      expect(readme).toMatch(/Estado del Sistema[^\n]*v1\.8\.22/);
      expect(readme).not.toMatch(/Estado del Sistema[^\n]*v1\.7\.22/);
    });
  });

  describe('I098 — VERSION de componentes sincronizados con CHANGELOG', () => {
    const latest = changelog.split(/^## 2026-08-15$/m)[1]?.split(/^## /m)[0] || changelog;
    const sections: Array<[string, string]> = [
      ['Backend', 'backend'],
      ['Frontend', 'frontend'],
      ['Firmware (ESP32-S3)', 'firmware'],
      ['Docs', 'docs'],
    ];

    it('cada componente tiene su versión en la sección de release del CHANGELOG', () => {
      for (const [label, dir] of sections) {
        const v = componentVersion(dir);
        expect(latest, `${dir} v${v} no documentado en CHANGELOG`).toContain(
          `### ${label} — v${v}`,
        );
      }
    });
  });
});
